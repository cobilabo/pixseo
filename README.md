# PixSEO

React + Firebase で構築するマルチテナント対応SEO特化型メディアプラットフォーム

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Firebase
  - Firestore (データベース)
  - Firebase Storage (画像・動画)
  - Firebase Authentication (認証)
  - Firebase Hosting (デプロイ)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、Firebaseの設定値を入力してください。

```bash
cp .env.local.example .env.local
```

### 3. Firebaseプロジェクトのセットアップ

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Webアプリを追加
3. 設定値を `.env.local` にコピー

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
ayumi/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # トップページ
│   ├── globals.css        # グローバルスタイル
│   └── media/             # メディアサイトのページ
├── components/            # Reactコンポーネント
├── lib/                   # ユーティリティ・設定
│   └── firebase/         # Firebase設定
├── types/                 # TypeScript型定義
├── public/               # 静的ファイル
├── firebase.json         # Firebase設定
├── firestore.rules       # Firestoreセキュリティルール
└── storage.rules         # Storageセキュリティルール
```

## 開発コマンド

- `npm run dev` - 開発サーバー起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動
- `npm run lint` - ESLint実行
- `npm run type-check` - TypeScript型チェック

## デプロイ

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## 主要機能

### 実装予定（優先度: 高）

- [x] プロジェクトセットアップ
- [ ] 記事一覧・詳細ページ
- [ ] 検索機能（キーワード・タグ）
- [ ] カテゴリー機能
- [ ] 関連記事の自動表示
- [ ] Googleマイマップ統合
- [ ] レスポンシブデザイン
- [ ] パフォーマンス最適化

### 次に実装予定

- [ ] 絞り込み検索
- [ ] よく検索されているキーワード表示
- [ ] リクエストフォーム
- [ ] 新着・人気記事ランキング

### 将来実装

- [ ] お気に入り機能
- [ ] 会員登録機能
- [ ] コメント機能
- [ ] 有料会員対応

## 参考資料

- [要件定義書](./requirements.md)
- [プロジェクト要約](./project-summary.md)

## ライセンス

Private


