# Firebase Functions + Next.js セットアップガイド

## 概要

Next.jsアプリケーションをFirebase FunctionsでSSR（サーバーサイドレンダリング）対応にするための設定です。

## セットアップ手順

### 1. Firebase Functionsの設定

```bash
cd functions
npm install
```

### 2. ビルド

```bash
# プロジェクトルートで
npm run build

# functionsディレクトリで
cd functions
npm run build
```

### 3. デプロイ

```bash
# プロジェクトルートで
firebase deploy --only functions,hosting
```

## 注意事項

### Firebase Admin SDKの認証情報

Firebase FunctionsでFirestoreにアクセスするには、認証情報の設定が必要です：

1. Firebase Consoleでサービスアカウントキーをダウンロード
2. 環境変数として設定するか、デフォルトの認証情報を使用

### コスト

Firebase Functionsは使用量に応じて課金されます：
- 無料枠: 200万リクエスト/月
- それ以上: $0.40/100万リクエスト

### パフォーマンス

- 初回リクエストはコールドスタートで遅くなる可能性があります
- メモリとタイムアウトの設定を調整できます

## トラブルシューティング

### ビルドエラー

```bash
# functionsディレクトリをクリーン
rm -rf functions/lib functions/node_modules
cd functions
npm install
npm run build
```

### デプロイエラー

```bash
# Firebase CLIのバージョンを確認
firebase --version

# ログインを確認
firebase login

# プロジェクトを確認
firebase use ayumi-f6bd2
```



