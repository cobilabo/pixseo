# デプロイガイド

## Firebase Hosting設定

このプロジェクトでは、2つのFirebase Hostingサイトを使用します：

1. **ユーザー向けサイト（本番環境）**
   - URL: `https://ayumi-f6bd2.web.app`
   - ターゲット: `production`
   - ディレクトリ: `out`

2. **管理画面（開発/管理環境）**
   - URL: `https://ayumi-f6bd2.firebaseapp.com`
   - ターゲット: `admin`
   - ディレクトリ: `out-admin`

## 初回セットアップ

### 1. Firebase CLIでログイン

```bash
firebase login
```

### 2. Firebaseプロジェクトを選択

```bash
firebase use ayumi-f6bd2
```

### 3. Firebase Hostingサイトの作成

Firebase Consoleで2つのホスティングサイトを作成する必要があります：

1. [Firebase Console](https://console.firebase.google.com/project/ayumi-f6bd2/hosting) にアクセス
2. 「サイトを追加」をクリック
3. サイトIDを入力：
   - 1つ目: `ayumi-f6bd2` (ユーザー向けサイト)
   - 2つ目: `ayumi-f6bd2-admin` (管理画面)

または、Firebase CLIで作成：

```bash
# ユーザー向けサイト（既に存在する場合はスキップ）
firebase hosting:sites:create ayumi-f6bd2

# 管理画面サイト
firebase hosting:sites:create ayumi-f6bd2-admin
```

### 4. ホスティングターゲットの設定

```bash
# ユーザー向けサイト
firebase target:apply hosting production ayumi-f6bd2

# 管理画面
firebase target:apply hosting admin ayumi-f6bd2-admin
```

## デプロイ手順

### ユーザー向けサイトのみデプロイ

```bash
npm run deploy:production
```

### 管理画面のみデプロイ

```bash
npm run deploy:admin
```

### 両方デプロイ

```bash
npm run deploy:all
```

または：

```bash
npm run build
firebase deploy --only hosting
```

## カスタムドメインの設定（オプション）

### ユーザー向けサイトにカスタムドメインを設定

1. Firebase Consoleで「ホスティング」を開く
2. `ayumi-f6bd2` サイトを選択
3. 「カスタムドメインを追加」をクリック
4. `the-ayumi.jp` または `media.the-ayumi.jp` を追加
5. DNS設定を完了

## 注意事項

- Next.jsは静的エクスポート（`output: 'export'`）を使用しているため、SSR機能は使用できません
- Firestoreへの接続はクライアントサイドでのみ可能です
- 画像最適化は無効化されています（`images.unoptimized: true`）

## トラブルシューティング

### ビルドエラー

```bash
rm -rf .next out out-admin
npm run build
```

### デプロイエラー

```bash
firebase logout
firebase login
firebase use ayumi-f6bd2
```

### ホスティングサイトが見つからない

Firebase Consoleでサイトが作成されているか確認し、`.firebaserc`の設定を確認してください。



