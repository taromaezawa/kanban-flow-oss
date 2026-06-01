# デプロイオプション比較 — kanban-flow-oss

## 概要

kanban-flow-oss（Next.js 14 App Router + Neon PostgreSQL）をデモ環境として公開するためのデプロイ先候補を比較します。

---

## 比較表

| 項目 | Vercel + Neon | Railway | Fly.io |
|------|--------------|---------|--------|
| **無料枠** | あり（Hobby: 月100GB帯域・関数実行制限） | あり（月$5クレジット） | あり（月$5クレジット相当） |
| **無料枠の制限** | 関数タイムアウト10秒、商用利用制限あり | クレジット消費後は停止 | 小インスタンスは常時起動可 |
| **Neon PostgreSQL との互換性** | ◎ 公式統合あり・ワンクリック接続 | ○ `DATABASE_URL` 設定で接続可 | ○ `DATABASE_URL` 設定で接続可 |
| **セットアップ難易度** | 低（GUIで完結） | 低〜中（CLIまたはGUI） | 中（Dockerfile or Buildpacks必要） |
| **Next.js 14 App Router との相性** | ◎ 公式ホスティング・Edge Runtime対応 | ○ Node.js環境として動作 | △ コンテナ起動オーバーヘッドあり |
| **デプロイコマンド** | `vercel --prod` | `railway up` | `fly deploy` |
| **カスタムドメイン** | 無料枠でも利用可 | 有料プランのみ | 無料枠でも利用可 |
| **OSS・デモ用途** | ◎ 最適 | ○ 可 | △ 設定コストあり |

---

## 各候補の詳細

### 1. Vercel + Neon（推奨）

**強み**
- Next.js の開発元が提供するホスティング。App Router・Server Components・Server Actions が完全サポート。
- Neon との公式パートナーシップにより、Vercel コンソールからワンクリックで Neon DB をプロビジョニング可能。
- `@neondatabase/serverless`（HTTP Driver）はサーバーレス環境向けに設計されており、Vercel のサーバーレス関数と最も相性が良い。
- GitHubリポジトリと連携するだけで自動デプロイが有効になり、OSS公開リポジトリのデモに最適。

**制限**
- Hobby（無料）プランは商用利用不可（個人・OSS デモは問題なし）。
- サーバーレス関数のタイムアウトは10秒（本プロジェクトの用途では十分）。

---

### 2. Railway

**強み**
- PostgreSQL コンテナを Railway 側で管理することもできるが、Neon の外部 DB も利用可能。
- GUI が直感的で、環境変数の設定が簡単。

**制限**
- 無料クレジット（月$5）はリソース消費で減少し、枯渇すると停止する。

> **注意（2026-06時点）**: Railway の料金プランは頻繁に変更されます。実際のデプロイ前に [Railway 公式サイト](https://railway.app/pricing) で最新情報を確認してください。
- Next.js のサーバーレス最適化は Vercel ほどではなく、Cold Start が発生しやすい。
- Neon との公式統合は存在せず、手動で `DATABASE_URL` を設定する必要がある。

---

### 3. Fly.io

**強み**
- コンテナベースのため、環境の再現性が高い。
- エッジロケーションへのデプロイが可能。

**制限**
- `Dockerfile` の作成または Buildpacks の設定が必要でセットアップコストが高い。
- Next.js App Router のサーバーレス機能との相性はコンテナ構成に依存する。
- Neon との統合はすべて手動設定。
- デモ公開という用途に対してオーバースペック気味。

---

## 結論：Vercel + Neon を推奨

本プロジェクトは **Neon HTTP Driver（`@neondatabase/serverless`）** を使用しており、サーバーレス環境向けに設計されています。Vercel はこの構成の動作を公式にサポートする唯一のプラットフォームであり、OpenAI Codex for OSS プログラムへのデモ公開という用途に最もマッチします。

---

## Vercel + Neon デプロイ手順

### 前提条件

- [Neon アカウント](https://neon.tech)（無料）
- [Vercel アカウント](https://vercel.com)（無料）
- Node.js 18+

### 手順

**1. Neon でデータベースを作成**

1. [console.neon.tech](https://console.neon.tech) でプロジェクトを作成
2. `db/schema.sql` の内容を Neon コンソールの SQL エディタで実行
3. 接続文字列（`DATABASE_URL`）をコピー

**2. settei.json を準備**

```bash
cp settei.json.example settei.json
# デモ用ユーザーのパスワードハッシュを生成して編集
node -e "console.log(require('bcryptjs').hashSync('demo_password', 10))"
```

**3. Vercel にデプロイ**

```bash
# Vercel CLI をインストール（初回のみ）
npm install -g vercel

# プロジェクトをリンク
vercel link

# 環境変数を設定
vercel env add DATABASE_URL         # Neon の接続文字列
vercel env add NEXT_PUBLIC_BASE_URL # https://your-project.vercel.app
vercel env add SLACK_BOT_TOKEN      # オプション（Slack 統合が不要な場合はスキップ）

# 本番デプロイ
vercel --prod
```

**4. settei.json の本番反映**

`settei.json` は `.gitignore` 対象のため、本番環境では環境変数で代替します。

**推奨方法: USERS_JSON 環境変数を使用**

```bash
# settei.json の内容をJSON文字列として Vercel に登録
vercel env add USERS_JSON
# プロンプトが出たら settei.json の内容をそのまま貼り付け（例: {"users":[...]}）
```

Vercel ダッシュボードから設定する場合:
1. Project Settings → Environment Variables
2. Name: `USERS_JSON`
3. Value: `settei.json` の内容をそのまま貼り付け
4. Environment: Production にチェック

すでに `SETTINGS_JSON` 環境変数への対応が `lib/users.ts` に実装されているため、追加のコード変更は不要です。

### 自動デプロイの設定（推奨）

GitHub リポジトリを Vercel に接続すると、`main` ブランチへのプッシュごとに自動デプロイが実行されます。

1. [vercel.com/new](https://vercel.com/new) でリポジトリをインポート
2. 環境変数を Vercel ダッシュボードで設定
3. 以降は `git push` だけでデプロイ完了

---

## 参考リンク

- [Vercel + Neon 公式統合ガイド](https://vercel.com/integrations/neon)
- [Neon HTTP Driver ドキュメント](https://neon.tech/docs/serverless/serverless-driver)
- [Vercel Hobby プラン制限](https://vercel.com/docs/limits/overview)
- [本プロジェクト README](./README.md)
