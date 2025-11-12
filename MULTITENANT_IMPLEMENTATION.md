# マルチテナント実装完了ガイド

## 📋 概要

PixSEOは、複数のメディアを一つのプラットフォームで管理できるマルチテナント対応のメディアプラットフォームです。

---

## ✅ 実装完了した機能

### Phase 1: マルチテナント基盤
- ✅ メディアテナント管理機能
  - 一覧表示
  - 新規作成
  - 編集
  - 削除
- ✅ 管理画面でのメディア切り替え機能
  - サイドバーにドロップダウン表示
  - LocalStorageで永続化
- ✅ 型定義へのmediaId追加
  - Article
  - Category
  - Tag
  - Banner
  - MediaFile

### Phase 2: データフィルタリング
- ✅ APIルートにmediaIdフィルタリング実装
- ✅ 新規作成時のmediaId自動付与
- ✅ API Client実装（lib/api-client.ts）
- ✅ 全管理画面ページでAPI Client使用

### Phase 3: カスタムドメイン対応（基盤）
- ✅ Middleware実装（middleware.ts）
- ✅ ドメイン判定API実装（/api/domain-to-media-id）
- ✅ サーバー関数にmediaIdパラメータ追加

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│                  管理画面                        │
│          admin.pixseo.cloud                     │
│  （または現在のVercelドメイン）                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ログイン → メディア選択 → データ管理            │
│                                                 │
│  ・記事管理（mediaIdでフィルタ）                │
│  ・カテゴリー管理（mediaIdでフィルタ）          │
│  ・タグ管理（mediaIdでフィルタ）                │
│  ・バナー管理（mediaIdでフィルタ）              │
│  ・メディアファイル管理（mediaIdでフィルタ）    │
│  ・メディアテナント管理                         │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│               メインアプリ                       │
│         （カスタムドメイン対応）                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  travel-abc.com    → メディアA                  │
│  gourmet-xyz.jp    → メディアB                  │
│  blog.pixseo.cloud → メディアC（サブドメイン）  │
│                                                 │
│  ・ドメインからmediaIdを自動判定                │
│  ・mediaId別にコンテンツを表示                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📊 データ構造

### テナント（`tenants`コレクション）

```typescript
{
  id: "tenant-abc-123",
  name: "旅行メディアABC",
  slug: "travel-abc",
  customDomain: "travel-abc.com",      // カスタムドメイン
  subdomain: "travel-abc",              // サブドメイン → travel-abc.pixseo.cloud
  ownerId: "user-uid-123",
  memberIds: ["user-uid-123", "user-uid-456"],
  settings: {
    siteName: "旅行メディアABC",
    siteDescription: "旅行情報をお届けします",
    logoUrl: "https://...",
  },
  isActive: true,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### 各エンティティ（記事・カテゴリー・タグなど）

```typescript
{
  id: "article-123",
  mediaId: "tenant-abc-123",  // ← 所属メディア
  title: "記事タイトル",
  // ... その他のフィールド
}
```

---

## 🚀 使用方法

### 管理画面

1. **ログイン**
   - `/admin/login` でログイン
   - 自動的に所属メディアが読み込まれる

2. **メディア切り替え**
   - サイドバー下部のドロップダウンで切り替え
   - 選択したメディアのデータのみが表示される

3. **新規メディア作成**
   - サイドバー「メディアテナント管理」をクリック
   - 右下の「+」ボタンから作成
   - メディア名、スラッグ、ドメインなどを設定

4. **データ管理**
   - 記事・カテゴリー・タグ・バナー・メディアファイル
   - すべて現在選択中のメディアに紐付く
   - 切り替えると自動的にフィルタリングされる

### メインアプリ（今後の拡張）

1. **カスタムドメイン設定**
   - メディア編集画面で「カスタムドメイン」を設定
   - DNS設定（CNAMEレコード追加）
   - Vercel Domainsで追加

2. **サブドメイン**
   - `{slug}.pixseo.cloud` で自動的にアクセス可能
   - 例：`travel-abc.pixseo.cloud`

---

## 🔧 技術詳細

### API Client（lib/api-client.ts）

現在選択中のmediaIdを自動的にリクエストヘッダーに追加します。

```typescript
// 使用例
import { apiGet, apiPost } from '@/lib/api-client';

// GETリクエスト（mediaIdが自動的にヘッダーに追加される）
const articles = await apiGet<Article[]>('/api/admin/articles');

// POSTリクエスト
await apiPost('/api/admin/blocks', {
  title: 'ブロックタイトル',
  imageUrl: 'https://...',
  mediaId: currentTenant.id, // 明示的に指定
});

// FormData（画像アップロードなど）
const formData = new FormData();
formData.append('file', file);
// mediaIdは自動的に追加される
await apiPostFormData('/api/admin/media/upload', formData);
```

### Middleware（middleware.ts）

カスタムドメインからmediaIdを判定します。

```typescript
// リクエストのhostnameを取得
const hostname = request.headers.get('host');

// カスタムドメインまたはサブドメインからmediaIdを取得
const mediaId = await getMediaIdByDomain(hostname);

// レスポンスヘッダーに追加
response.headers.set('x-media-id', mediaId);
```

---

## 📝 マイグレーション

既存データにmediaIdを付与するマイグレーションスクリプトを用意しています。

### 実行方法

```bash
# Firebaseにログイン
firebase login

# ADC設定
gcloud auth application-default login

# マイグレーション実行
npx ts-node scripts/migrate-add-media-id.ts
```

### 実行内容

1. デフォルトメディア「PixSEO」を作成
2. 既存の全データ（記事・カテゴリー・タグ・バナー・メディアファイル）にデフォルトmediaIdを付与

詳細は `scripts/MIGRATION_GUIDE.md` を参照してください。

---

## 🔐 セキュリティ

### Firestore Rules（必須）

mediaIdベースのアクセス制御を実装してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 記事
    match /articles/{articleId} {
      // 読み取りは公開記事のみ
      allow read: if resource.data.isPublished == true;
      
      // 書き込みは認証済み & 所属メディアのメンバーのみ
      allow write: if request.auth != null && 
                      isMediaMember(resource.data.mediaId);
    }
    
    // メンバーチェック関数
    function isMediaMember(mediaId) {
      let tenant = get(/databases/$(database)/documents/tenants/$(mediaId));
      return request.auth.uid in tenant.data.memberIds || 
             request.auth.uid == tenant.data.ownerId;
    }
  }
}
```

---

## 🎯 次のステップ

### すぐに実装すべきもの

1. ✅ Firestore Rulesの更新（mediaIdベースのアクセス制御）
2. ✅ Firestore Indexesの作成
   ```bash
   # 必要なインデックス
   - articles: mediaId + isPublished + publishedAt
   - categories: mediaId + name
   - tags: mediaId + name
   - banners: mediaId + order
   - media: mediaId + createdAt
   ```

### 今後実装するもの

3. ⏳ メインアプリのカスタムドメイン完全対応
4. ⏳ Vercel Domainsとの連携
5. ⏳ メンバー管理機能の拡充
6. ⏳ 権限管理（オーナー/編集者/閲覧者）

---

## 📚 関連ドキュメント

- [マイグレーションガイド](./scripts/MIGRATION_GUIDE.md)
- [README](./README.md)

---

## 🆘 トラブルシューティング

### データが表示されない

1. メディアが選択されているか確認
2. マイグレーションを実行したか確認
3. ブラウザのLocalStorageに`currentTenantId`があるか確認

### 画像アップロードが失敗する

1. mediaIdが正しく渡されているか確認
2. Firebase Storageのルールを確認
3. ブラウザのコンソールでエラーを確認

### メディア切り替えが動作しない

1. ページをリロード
2. LocalStorageをクリア
3. ログアウト→再ログイン

---

**実装完了日**: 2025-01-08
**プロジェクト**: PixSEO (pixseo.cloud)
**バージョン**: 1.0.0

