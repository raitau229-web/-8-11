-- 過去問共有アプリ スキーマ(ログインなし版)
-- Supabase の SQL Editor でこのファイルの内容を実行してください。
--
-- ログインを設けていないため、リンクを知っている人なら誰でも閲覧・投稿できます。
-- 学内の限られた相手にリンクを共有する用途を想定した、ゆるい共有設定です。

create extension if not exists "pgcrypto";

-- ============================================================
-- テーブル
-- ============================================================

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
  created_at timestamptz not null default now()
);

create index if not exists course_offerings_course_id_idx on public.course_offerings (course_id);
create index if not exists exams_offering_id_idx on public.exams (offering_id);

-- ============================================================
-- RLS(Row Level Security)
-- ログイン機能がないため anon ロールに対して素直に許可する。
-- ============================================================

alter table public.courses enable row level security;
alter table public.course_offerings enable row level security;
alter table public.exams enable row level security;

create policy "courses_all" on public.courses
  for all to anon, authenticated
  using (true)
  with check (true);

create policy "offerings_all" on public.course_offerings
  for all to anon, authenticated
  using (true)
  with check (true);

create policy "exams_all" on public.exams
  for all to anon, authenticated
  using (true)
  with check (true);

-- ============================================================
-- Storage(過去問ファイル)。公開バケットにして直リンクで閲覧できるようにする。
-- ============================================================

insert into storage.buckets (id, name, public)
values ('exams', 'exams', true)
on conflict (id) do update set public = true;

create policy "exams_storage_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'exams');

create policy "exams_storage_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'exams');

create policy "exams_storage_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'exams');
