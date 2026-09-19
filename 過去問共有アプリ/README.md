# 過去問共有アプリ(大阪公立大学向け)

授業ごとに過去問(PDF・画像)を共有できる学内向けアプリです。Next.js(App Router)+ Supabase で構築しています。

ログイン機能はなく、URLを知っている人なら誰でも閲覧・投稿できる、ゆるい共有ツールです。

## データ構造

重複登録を防ぐため、授業は自由入力ではなくマスタから選ぶ形にしています。

1. **courses(授業マスタ)** — 授業名・学部。`/admin/courses` から誰でも追加・一括インポートできます。
2. **course_offerings(開講情報)** — 授業 × 年度 × 担当教師。過去問アップロード時に既存のものを選ぶか、新規に追加できます。
3. **exams(過去問)** — 開講情報に紐づくファイル(Supabase Storage の公開バケットに保存)。

## セットアップ

### 1. Supabase プロジェクトを作成

1. [Supabase](https://supabase.com) でプロジェクトを新規作成します。
2. `supabase/schema.sql` の内容を SQL Editor で実行します(テーブル・RLS・Storage バケットが作成されます)。

### 2. 環境変数を設定

`.env.local.example` を `.env.local` にコピーし、Supabase の Project Settings > API Keys から値を入れます。

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. 依存関係のインストールと起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

## 主な画面

- `/` — 授業一覧・検索
- `/courses/[id]` — 授業詳細。担当教師 × 年度ごとに過去問を一覧表示し、アップロードフォームから追加できます
- `/admin/courses` — 授業マスタの追加・一括インポート(既存のシラバスデータなどを「授業名,学部」形式で貼り付け)

## 注意点

ログインがないため、アプリのURLとSupabaseの匿名キーが分かれば誰でもデータの読み書きができます。学内の限られた相手にだけリンクを共有する運用を想定しています。あとから大学メール限定のログインを追加したくなった場合は、その旨を伝えてください。

## 本番デプロイ

Vercel など任意のホスティングにデプロイし、上記の環境変数を設定してください。Supabase 側は追加設定不要です。
