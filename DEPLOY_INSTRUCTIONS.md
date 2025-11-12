# デプロイ手順

## 1. Firebase CLIでログイン

ターミナルで以下のコマンドを実行してください：

```bash
firebase login
```

ブラウザが開くので、Googleアカウントでログインしてください。

## 2. Firebaseプロジェクトを選択

```bash
firebase use ayumi-f6bd2
```

## 3. Firebase Hostingサイトの作成

Firebase Consoleで2つのホスティングサイトを作成する必要があります。

### 方法1: Firebase Consoleから作成

1. [Firebase Console - Hosting](https://console.firebase.google.com/project/ayumi-f6bd2/hosting) にアクセス
2. 「サイトを追加」をクリック
3. サイトIDを入力：
   - **1つ目**: `ayumi-f6bd2` (ユーザー向けサイト - web.app)
   - **2つ目**: `ayumi-f6bd2-admin` (管理画面 - firebaseapp.com)

### 方法2: Firebase CLIで作成

```bash
# ユーザー向けサイト（既に存在する場合はスキップ）
firebase hosting:sites:create ayumi-f6bd2

# 管理画面サイト
firebase hosting:sites:create ayumi-f6bd2-admin
```

## 4. ホスティングターゲットの設定

```bash
# ユーザー向けサイト
firebase target:apply hosting production ayumi-f6bd2

# 管理画面
firebase target:apply hosting admin ayumi-f6bd2-admin
```

## 5. ビルドとデプロイ

### ユーザー向けサイト（web.app）のみデプロイ

```bash
npm run deploy:production
```

### 管理画面（firebaseapp.com）のみデプロイ

```bash
npm run deploy:admin
```

### 両方デプロイ

```bash
npm run deploy:all
```

## デプロイ後の確認

- ユーザー向けサイト: https://ayumi-f6bd2.web.app
- 管理画面: https://ayumi-f6bd2.firebaseapp.com

## 注意事項

- 初回デプロイ時は、Firebase Consoleでサイトを作成してからデプロイしてください
- 管理画面は現在、ユーザー向けサイトと同じ内容が表示されます
- 今後、管理画面用の別のアプリケーションを作成する予定です



