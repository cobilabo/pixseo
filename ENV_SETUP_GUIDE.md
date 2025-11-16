# 環境変数セットアップガイド

このドキュメントは、AI記事生成システムに必要な環境変数の設定方法を説明します。

## 必要な環境変数

### 既存の環境変数（確認が必要）

以下の環境変数が `.env.local` に設定されていることを確認してください：

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Grok API Key (X.AI)
GROK_API_KEY=xai-...

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com

# Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
ALGOLIA_ADMIN_KEY=your-admin-key

# Site URL
NEXT_PUBLIC_SITE_URL=https://cobilabo.pixseo.cloud
```

### 新規追加が必要な環境変数

#### 1. Cron Secret（必須）

Vercel Cron Jobsからの認証に使用します。

```bash
# Cron認証用のシークレットキー
CRON_SECRET=your-secure-random-string-here
```

**生成方法:**

```bash
# ランダムな文字列を生成（推奨）
openssl rand -hex 32
```

または

```bash
# Node.jsで生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ローカル開発環境

### .env.local ファイル

プロジェクトのルートディレクトリに `.env.local` ファイルを作成（または編集）：

```bash
# AI APIs
OPENAI_API_KEY=sk-your-openai-key
GROK_API_KEY=xai-your-grok-key

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com

# Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
ALGOLIA_ADMIN_KEY=your-admin-key

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Cron Secret
CRON_SECRET=your-secure-random-string
```

## Vercel 本番環境

### 環境変数の設定

1. Vercel ダッシュボードを開く
2. プロジェクトを選択
3. Settings > Environment Variables
4. 以下の環境変数を追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `OPENAI_API_KEY` | `sk-...` | Production, Preview, Development |
| `GROK_API_KEY` | `xai-...` | Production, Preview, Development |
| `FIREBASE_PROJECT_ID` | `your-project-id` | Production, Preview, Development |
| `FIREBASE_CLIENT_EMAIL` | `your-email@...` | Production, Preview, Development |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Production, Preview, Development |
| `FIREBASE_STORAGE_BUCKET` | `your-bucket.appspot.com` | Production, Preview, Development |
| `NEXT_PUBLIC_ALGOLIA_APP_ID` | `your-app-id` | Production, Preview, Development |
| `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` | `your-search-key` | Production, Preview, Development |
| `ALGOLIA_ADMIN_KEY` | `your-admin-key` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://cobilabo.pixseo.cloud` | Production |
| `CRON_SECRET` | `your-secure-random-string` | Production |

### 重要な注意事項

1. **FIREBASE_PRIVATE_KEY**
   - 改行文字（`\n`）を含める必要があります
   - Vercel では、ダブルクォートで囲まずに直接貼り付けてください

2. **NEXT_PUBLIC_** プレフィックス
   - `NEXT_PUBLIC_` で始まる変数はクライアントサイドでも利用可能です
   - 秘密情報は `NEXT_PUBLIC_` を付けないでください

3. **CRON_SECRET**
   - Vercel の Production 環境にのみ設定してください
   - 他の環境では Cron Jobs は実行されません

## API Key の取得方法

### OpenAI API Key

1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. API Keys ページで新しいキーを作成
3. `sk-` で始まるキーをコピー

### Grok API Key (X.AI)

1. [X.AI Console](https://console.x.ai/) にアクセス
2. API Keys ページで新しいキーを作成
3. `xai-` で始まるキーをコピー

### Firebase Admin SDK

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト設定 > サービスアカウント
3. 「新しい秘密鍵の生成」をクリック
4. ダウンロードされた JSON ファイルから必要な値を抽出

### Algolia

1. [Algolia Dashboard](https://www.algolia.com/) にアクセス
2. Settings > API Keys
3. Application ID と Search-Only API Key、Admin API Key をコピー

## 動作確認

### 1. 環境変数が正しく設定されているか確認

```bash
# ローカル環境
npm run dev
```

開発サーバーが起動すれば、最低限の設定は完了しています。

### 2. AI記事生成をテスト

1. `/admin-panel/articles/` にアクセス
2. 「AI高度記事生成」ボタンをクリック
3. 各項目を選択して「生成開始」をクリック
4. 3〜5分待つ

### 3. Cron エンドポイントをテスト

```bash
# ローカル環境
curl -X GET http://localhost:3000/api/cron/generate-articles \
  -H "Authorization: Bearer your-cron-secret"
```

## トラブルシューティング

### エラー: "API key is not configured"

→ 該当する API Key の環境変数が設定されていません。`.env.local` を確認してください。

### エラー: "Unauthorized"

→ `CRON_SECRET` が正しく設定されていないか、Authorization ヘッダーが間違っています。

### Firebase 接続エラー

→ `FIREBASE_PRIVATE_KEY` の改行文字（`\n`）が正しくエスケープされているか確認してください。

### Algolia 同期エラー

→ `ALGOLIA_ADMIN_KEY` が設定されているか確認してください。検索専用キーでは書き込みできません。

## セキュリティ

- `.env.local` は **絶対に Git にコミットしないでください**
- API Key は定期的にローテーションしてください
- Vercel の環境変数は暗号化されて保存されます
- `CRON_SECRET` は推測されにくい文字列を使用してください

## 参考リンク

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [X.AI Grok API Documentation](https://docs.x.ai/)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Algolia Documentation](https://www.algolia.com/doc/)

