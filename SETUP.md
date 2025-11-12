# Firebase設定手順

## 環境変数ファイルの作成

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容をコピーしてください：

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDi8DiIdhLCJO9bXAzBGdeKwBBi7gYPXHs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ayumi-f6bd2.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ayumi-f6bd2
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ayumi-f6bd2.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=561071971625
NEXT_PUBLIC_FIREBASE_APP_ID=1:561071971625:web:0e382383fbb444c0066b38

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://the-ayumi.jp
NEXT_PUBLIC_MEDIA_BASE_PATH=/media

# Google Maps API (if needed)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

## 次のステップ

1. `.env.local` ファイルを作成（上記の内容をコピー）
2. 開発サーバーを起動: `npm run dev`
3. Firebase接続を確認

## Firebase Consoleでの設定確認

以下の設定が正しく行われているか確認してください：

1. **Firestore Database**
   - データベースが作成されているか
   - セキュリティルールが設定されているか（`firestore.rules`を参照）

2. **Storage**
   - Storageが有効化されているか
   - セキュリティルールが設定されているか（`storage.rules`を参照）

3. **Authentication**（将来実装時に必要）
   - 認証プロバイダーの設定

## セキュリティルールのデプロイ

Firebase CLIを使用してセキュリティルールをデプロイする場合：

```bash
firebase deploy --only firestore:rules,storage:rules
```



