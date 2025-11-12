# 開発ガイド

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`env.example` を参考に `.env.local` を作成してください。

```bash
# .env.local を作成
cp env.example .env.local
```

`.env.local` にFirebaseの設定値を入力してください。

### 3. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `ayumi-media`）
4. Google Analyticsの設定（任意）
5. プロジェクトを作成

### 4. Firebase Webアプリの追加

1. Firebase Consoleで「</>」アイコンをクリック
2. アプリのニックネームを入力
3. 「このアプリのFirebase Hostingも設定します」はチェックしない（後で設定）
4. 「アプリを登録」をクリック
5. 表示された設定値を `.env.local` にコピー

### 5. Firestoreデータベースの作成

1. Firebase Consoleで「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. 「テストモードで開始」を選択（後でセキュリティルールを設定）
4. ロケーションを選択（`asia-northeast1` 推奨）

### 6. Firebase Storageの有効化

1. Firebase Consoleで「Storage」を選択
2. 「始める」をクリック
3. セキュリティルールは「テストモードで開始」を選択
4. ロケーションを選択（Firestoreと同じロケーション推奨）

### 7. Firebase CLIのインストール（オプション）

デプロイやローカル開発に使用します。

```bash
npm install -g firebase-tools
firebase login
firebase init
```

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
ayumi/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # トップページ
│   ├── globals.css          # グローバルスタイル
│   └── media/               # メディアサイトのページ（今後作成）
│       ├── page.tsx         # メディアトップ
│       ├── articles/        # 記事一覧・詳細
│       └── search/          # 検索ページ
├── components/              # Reactコンポーネント
│   ├── articles/           # 記事関連コンポーネント
│   ├── search/             # 検索関連コンポーネント
│   └── common/             # 共通コンポーネント
├── lib/                     # ユーティリティ・設定
│   └── firebase/           # Firebase設定・関数
│       ├── config.ts       # Firebase初期化
│       ├── articles.ts     # 記事取得関数
│       └── types.ts        # Firestore型定義
├── types/                   # TypeScript型定義
│   └── article.ts          # 記事関連の型
├── public/                  # 静的ファイル
├── firebase.json           # Firebase設定
├── firestore.rules         # Firestoreセキュリティルール
└── storage.rules           # Storageセキュリティルール
```

## コーディング規約

### TypeScript

- 型定義を必ず記述する
- `any` の使用は最小限に
- インターフェースは `types/` ディレクトリに配置

### コンポーネント

- 関数コンポーネントを使用
- コンポーネント名はPascalCase
- ファイル名はコンポーネント名と同じ

### スタイリング

- Tailwind CSSを使用
- カスタムスタイルは `globals.css` またはコンポーネント内で定義
- レスポンシブデザインを意識

## データベース設計

### Firestore コレクション構造

```
articles/
  {articleId}/
    - title: string
    - content: string
    - excerpt?: string
    - slug: string
    - publishedAt: Timestamp
    - updatedAt: Timestamp
    - authorId: string
    - authorName: string
    - categoryIds: string[]
    - tagIds: string[]
    - featuredImage?: string
    - isPublished: boolean
    - viewCount: number
    - likeCount: number
    - metaTitle?: string
    - metaDescription?: string
    - isVerifiedLocation?: boolean
    - verifiedLocationId?: string
    - reservationUrl?: string
    - googleMapsUrl?: string
    - latitude?: number
    - longitude?: number

categories/
  {categoryId}/
    - name: string
    - slug: string
    - description?: string
    - isRecommended?: boolean
    - order?: number

tags/
  {tagId}/
    - name: string
    - slug: string
    - searchCount?: number

users/ (将来実装)
  {userId}/
    - email: string
    - displayName?: string
    - createdAt: Timestamp

favorites/ (将来実装)
  {favoriteId}/
    - userId: string
    - articleId: string
    - createdAt: Timestamp

requests/ (将来実装)
  {requestId}/
    - userId: string
    - content: string
    - createdAt: Timestamp
```

## 次のステップ

1. ✅ プロジェクトセットアップ完了
2. [ ] 記事一覧ページの実装
3. [ ] 記事詳細ページの実装
4. [ ] 検索機能の実装
5. [ ] カテゴリー・タグ機能の実装
6. [ ] Googleマイマップ統合
7. [ ] レスポンシブデザインの実装
8. [ ] パフォーマンス最適化

## トラブルシューティング

### Firebase接続エラー

- `.env.local` の設定値が正しいか確認
- Firebase Consoleでプロジェクトが作成されているか確認
- セキュリティルールが正しく設定されているか確認

### ビルドエラー

```bash
npm run type-check
```

型エラーを確認してください。

### 依存関係のエラー

```bash
rm -rf node_modules package-lock.json
npm install
```



