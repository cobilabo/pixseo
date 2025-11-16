# Algolia 多言語インデックス設定手順

## 概要

本プロジェクトでは、Algoliaの**言語別インデックス**を使用して多言語検索を実装しています。

- 日本語（ja）: `pixseo_articles_production_ja`
- 英語（en）: `pixseo_articles_production_en`
- 中国語（zh）: `pixseo_articles_production_zh`
- 韓国語（ko）: `pixseo_articles_production_ko`

## 1. Algoliaダッシュボードでインデックスを作成

### 手順

1. [Algolia Dashboard](https://www.algolia.com/apps/BLXOYFPK52/dashboard) にログイン
2. 左メニューから **Search > Index** を選択
3. 各言語のインデックスを作成（既存の場合はスキップ）：
   - `pixseo_articles_production_ja`
   - `pixseo_articles_production_en`
   - `pixseo_articles_production_zh`
   - `pixseo_articles_production_ko`

## 2. 各インデックスの設定

### 2.1 Searchable attributes（検索対象フィールド）

各インデックスで以下の順番に設定：

```
1. title
2. contentText
3. excerpt
4. categories
5. tags
```

**設定方法:**
- Index > Configuration > Searchable attributes
- 上記の順番で追加

### 2.2 Attributes for faceting（フィルタリング用フィールド）

各インデックスで以下を設定：

```
- isPublished (searchable)
- mediaId (searchable)
- categories (searchable)
- tags (searchable)
```

**設定方法:**
- Index > Configuration > Facets
- 各フィールドを追加し、`searchable` にチェック

### 2.3 Ranking（ランキング設定）

デフォルトのままでOK。必要に応じて調整：

```
1. typo
2. geo
3. words
4. filters
5. proximity
6. attribute
7. exact
8. custom (desc(publishedAt))
```

## 3. 既存記事の同期

すべてのインデックス設定が完了したら、既存記事を同期します：

```bash
# ローカル環境で実行
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/sync-articles-to-algolia.ts
```

**または、管理画面から記事を再保存（少数の場合）:**
- https://admin.pixseo.cloud/articles/ で各記事を編集 > 保存

## 4. 動作確認

### 4.1 インデックスにデータが入っているか確認

Algolia Dashboard:
- Search > Index > `pixseo_articles_production_ja` を開く
- Browse タブで記事が表示されることを確認
- 他の言語（en, zh, ko）も同様に確認

### 4.2 検索機能のテスト

メインアプリで各言語の検索をテスト：

- 日本語: https://cobilabo.pixseo.cloud/ja/search/?q=AI
- 英語: https://cobilabo.pixseo.cloud/en/search/?q=AI
- 中国語: https://cobilabo.pixseo.cloud/zh/search/?q=AI
- 韓国語: https://cobilabo.pixseo.cloud/ko/search/?q=AI

## 5. トラブルシューティング

### 検索結果が0件

**原因1: インデックスが未作成**
- Algolia Dashboardで該当インデックスが存在するか確認

**原因2: Facet設定が未完了**
- `isPublished` と `mediaId` が Facets に追加されているか確認

**原因3: データが未同期**
- スクリプトを実行するか、管理画面から記事を再保存

### コンソールにエラーが出る

**エラー: `Index does not exist`**
- Algolia Dashboardでインデックスを作成

**エラー: `Attribute X is not in attributes for faceting`**
- Facets設定で該当フィールドを追加

## 6. 運用

### 新規記事の自動同期

記事を保存・更新すると、自動的に**全言語のインデックス**に同期されます：
- 記事作成: `app/api/admin/articles/route.ts`
- 記事更新: `app/api/admin/articles/[id]/update/route.ts`

### 記事の削除

記事を削除すると、自動的に**全言語のインデックス**から削除されます。

## 7. コスト管理

Algoliaの無料枠:
- 検索リクエスト: 10,000/月
- レコード数: 10,000件
- 運用単位: 100,000/月

**現在の使用状況（4記事 × 4言語 = 16レコード）:**
- レコード数: 16 / 10,000
- 余裕十分 ✅

---

## 参考リンク

- [Algolia Dashboard](https://www.algolia.com/apps/BLXOYFPK52/dashboard)
- [Algolia Documentation](https://www.algolia.com/doc/)
- [API Keys](https://www.algolia.com/apps/BLXOYFPK52/api-keys/all)

## 完了チェックリスト

- [ ] 4つのインデックスを作成（ja, en, zh, ko）
- [ ] 各インデックスのSearchable attributesを設定
- [ ] 各インデックスのFacetsを設定（isPublished, mediaId, categories, tags）
- [ ] 既存記事の同期スクリプトを実行
- [ ] 各言語の検索ページで動作確認

