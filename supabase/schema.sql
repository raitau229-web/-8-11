-- 過去問共有アプリ スキーマ
-- Supabase の SQL Editor でこのファイルの内容を実行してください。

create extension if not exists "pgcrypto";

-- ============================================================
-- テーブル
-- ============================================================

-- サインアップを許可するメールドメイン(例: 'st.omu.ac.jp')
create table if not exists public.allowed_email_domains (
  domain text primary key
);

-- 授業マスタ(自由入力ではなく、事前に登録されたものから選ぶ)
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null default '',
  created_at timestamptz not null default now(),
  unique (name, department)
);

-- 開講情報(年度 x 担当教師)。同じ授業でも年度・教師違いで分けて管理する。
create table if not exists public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  year int not null,
  teacher_name text not null,
  created_at timestamptz not null default now(),
  unique (course_id, year, teacher_name)
);

-- 過去問ファイル本体は Storage に置き、ここにはメタデータのみ保存する。
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  exam_type text,
  file_path text not null,
  file_name text not null,
  note text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ユーザープロフィール(管理者フラグなど)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists course_offerings_course_id_idx on public.course_offerings (course_id);
create index if not exists exams_offering_id_idx on public.exams (offering_id);

-- ============================================================
-- 新規ユーザー登録時の処理
-- ============================================================

-- 許可されたメールドメイン以外はサインアップ自体を拒否する
create or replace function public.enforce_allowed_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_domain text;
begin
  email_domain := lower(split_part(new.email, '@', 2));

  if not exists (
    select 1 from public.allowed_email_domains d
    where lower(d.domain) = email_domain
  ) then
    raise exception 'このメールドメイン(%)では登録できません', email_domain;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_allowed_email_domain_trigger on auth.users;
create trigger enforce_allowed_email_domain_trigger
  before insert on auth.users
  for each row execute function public.enforce_allowed_email_domain();

-- 新規ユーザー作成時に profiles 行を自動作成する
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 権限チェック用ヘルパー
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ============================================================
-- RLS(Row Level Security)
-- ============================================================

alter table public.allowed_email_domains enable row level security;
alter table public.courses enable row level security;
alter table public.course_offerings enable row level security;
alter table public.exams enable row level security;
alter table public.profiles enable row level security;

-- allowed_email_domains: 管理者のみ閲覧・編集可能(サインアップ時のチェックは security definer 関数が行うため RLS の影響を受けない)
create policy "domains_admin_all" on public.allowed_email_domains
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- courses: 認証済みユーザーは全員閲覧可能。追加・変更・削除は管理者のみ(重複授業の乱立を防ぐため)
create policy "courses_select" on public.courses
  for select to authenticated
  using (true);

create policy "courses_admin_insert" on public.courses
  for insert to authenticated
  with check (public.is_admin());

create policy "courses_admin_update" on public.courses
  for update to authenticated
  using (public.is_admin());

create policy "courses_admin_delete" on public.courses
  for delete to authenticated
  using (public.is_admin());

-- course_offerings: 認証済みユーザーは全員閲覧可能。年度・担当教師の追加は誰でも可能(授業自体は追加できない)。削除は管理者のみ
create policy "offerings_select" on public.course_offerings
  for select to authenticated
  using (true);

create policy "offerings_insert" on public.course_offerings
  for insert to authenticated
  with check (true);

create policy "offerings_admin_delete" on public.course_offerings
  for delete to authenticated
  using (public.is_admin());

-- exams: 認証済みユーザーは全員閲覧可能。アップロードは本人の uploaded_by のみ許可。削除は本人か管理者
create policy "exams_select" on public.exams
  for select to authenticated
  using (true);

create policy "exams_insert" on public.exams
  for insert to authenticated
  with check (uploaded_by = auth.uid());

create policy "exams_delete_own_or_admin" on public.exams
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- profiles: 本人か管理者のみ閲覧可能。更新は本人のみ(is_admin は自分では変更できない)
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

-- ============================================================
-- Storage(過去問ファイル)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('exams', 'exams', false)
on conflict (id) do nothing;

create policy "exams_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'exams');

create policy "exams_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exams');

create policy "exams_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exams'
    and (owner = auth.uid() or public.is_admin())
  );

-- ============================================================
-- 初期セットアップ例(必要に応じて書き換えて実行してください)
-- ============================================================

-- 大阪公立大学のメールドメインを許可する例。実際のドメインに置き換えてください。
-- insert into public.allowed_email_domains (domain) values ('st.omu.ac.jp');

-- 特定ユーザーを管理者にする例(先にそのメールでログインし、profiles 行が作成された後に実行)。
-- update public.profiles set is_admin = true where id = (select id from auth.users where email = 'admin@st.omu.ac.jp');
