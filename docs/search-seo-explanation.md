# 検索結果ページのSEO対応について

## 質問：検索結果ページはSEOでインデックスされますか？

**答え：状況によって異なります**

## 1. 通常の検索結果ページ（クエリパラメータ付き）

### 例：`/media/search?q=渋谷区の飲食店`

**インデックスされにくい理由：**
- URLにクエリパラメータ（`?q=...`）が含まれる
- 検索エンジンは「一時的な検索結果」と判断する
- 同じURLでも検索結果が変わる可能性がある
- 重複コンテンツと判断される可能性がある

**Googleの対応：**
- 基本的にインデックスしない（またはインデックスしても優先度が低い）
- `noindex`タグを推奨する場合もある

## 2. カテゴリーページやタグページ

### 例：`/media/categories/渋谷区` や `/media/tags/飲食店`

**インデックスされるべき：**
- 固定のURL構造
- 一意のコンテンツ
- ユーザーにとって価値のあるページ

**メリット：**
- 「渋谷区 バリアフリー」で検索された時に、カテゴリーページが表示される
- 「飲食店 車椅子」で検索された時に、タグページが表示される

## 3. 推奨される実装方法

### パターン1：カテゴリーページを作成

```javascript
// /media/categories/[category]/page.tsx
export default async function CategoryPage({ params }) {
  const category = await getCategory(params.category);
  const articles = await getArticles({ categoryId: category.id });
  
  return (
    <>
      <Head>
        <title>{category.name}の記事一覧 | ふらっと。</title>
        <meta name="description" content={`${category.name}に関するバリアフリー情報記事一覧`} />
      </Head>
      <h1>{category.name}の記事</h1>
      {/* 記事一覧 */}
    </>
  );
}
```

**メリット：**
- SEOに強い
- ユーザーにとって分かりやすいURL
- 検索エンジンがインデックスしやすい

### パターン2：検索結果ページにnoindexを設定

```javascript
// /media/search/page.tsx
export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  
  return (
    <>
      <Head>
        {query && (
          <meta name="robots" content="noindex, nofollow" />
        )}
        <title>{query ? `${query}の検索結果` : '検索'} | ふらっと。</title>
      </Head>
      {/* 検索結果 */}
    </>
  );
}
```

**メリット：**
- 検索エンジンに「このページはインデックス不要」と伝える
- カテゴリーページやタグページはインデックスされる

### パターン3：絞り込み検索をURLパスで表現

```javascript
// /media/search/area/渋谷区/type/飲食店
// または
// /media/area/渋谷区/type/飲食店

export default async function FilteredPage({ params }) {
  const { area, type } = params;
  const articles = await getArticles({ area, type });
  
  return (
    <>
      <Head>
        <title>{area}の{type}情報 | ふらっと。</title>
        <meta name="description" content={`${area}の${type}に関するバリアフリー情報`} />
      </Head>
      {/* 記事一覧 */}
    </>
  );
}
```

**メリット：**
- SEOに強い
- URLが分かりやすい
- 検索エンジンが理解しやすい

## 4. 現在の実装の改善案

### 現状の問題点

現在の実装：
- `/media/search?q=渋谷区の飲食店` → インデックスされにくい
- カテゴリーページが未実装

### 改善案

1. **カテゴリーページを実装**
   - `/media/categories/渋谷区`
   - `/media/categories/飲食店`
   - これらのページはSEOに強い

2. **検索結果ページにnoindexを設定**
   - クエリパラメータ付きの検索結果はnoindex
   - カテゴリーページやタグページはインデックス

3. **絞り込み検索をURLパスで表現**
   - `/media/area/渋谷区/type/飲食店`
   - これもSEOに強い

## 5. 実装例

### カテゴリーページの実装

```typescript
// app/media/categories/[slug]/page.tsx
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map(cat => ({ slug: cat.slug }));
}

export default async function CategoryPage({ params }) {
  const category = await getCategory(params.slug);
  const articles = await getArticles({ categoryId: category.id });
  
  return (
    <>
      <Head>
        <title>{category.name}の記事一覧 | ふらっと。</title>
        <meta name="description" content={`${category.name}に関するバリアフリー情報記事一覧`} />
        <meta property="og:title" content={`${category.name}の記事一覧`} />
      </Head>
      <h1>{category.name}の記事</h1>
      {/* 記事一覧 */}
    </>
  );
}
```

### 検索結果ページの改善

```typescript
// app/media/search/page.tsx
export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  
  return (
    <>
      <Head>
        {/* クエリパラメータ付きの検索結果はnoindex */}
        {query && (
          <meta name="robots" content="noindex, nofollow" />
        )}
        <title>{query ? `${query}の検索結果` : '検索'} | ふらっと。</title>
      </Head>
      {/* 検索結果 */}
    </>
  );
}
```

## 6. SEO戦略のまとめ

### インデックスすべきページ

✅ **カテゴリーページ**
- `/media/categories/渋谷区`
- `/media/categories/飲食店`

✅ **タグページ**
- `/media/tags/車椅子`
- `/media/tags/バリアフリー`

✅ **記事詳細ページ**
- `/media/articles/記事のslug`

✅ **トップページ**
- `/media`

### インデックスしないページ

❌ **検索結果ページ（クエリパラメータ付き）**
- `/media/search?q=渋谷区の飲食店`
- → noindexを設定

❌ **管理画面**
- `/admin/*`
- → noindexを設定

## 7. 実際の検索での表示例

### 良い例（カテゴリーページ）

ユーザーが「渋谷区 バリアフリー 飲食店」で検索
↓
Google検索結果に表示：
- **タイトル**: 「渋谷区の飲食店情報 | ふらっと。」
- **URL**: `https://the-ayumi.jp/media/categories/渋谷区`
- **説明**: 「渋谷区の飲食店に関するバリアフリー情報記事一覧」

### 悪い例（検索結果ページ）

ユーザーが「渋谷区 バリアフリー 飲食店」で検索
↓
Google検索結果に表示されない（または優先度が低い）
- **URL**: `https://the-ayumi.jp/media/search?q=渋谷区の飲食店`
- → インデックスされていない、またはnoindexが設定されている

## まとめ

1. **検索結果ページ（`?q=...`）は基本的にインデックスされない**
   - クエリパラメータ付きのURLは検索エンジンに好まれない
   - noindexを設定することを推奨

2. **カテゴリーページやタグページはインデックスされるべき**
   - 固定のURL構造
   - 一意のコンテンツ
   - SEOに強い

3. **推奨される実装**
   - カテゴリーページを実装（`/media/categories/[slug]`）
   - タグページを実装（`/media/tags/[slug]`）
   - 検索結果ページにnoindexを設定

4. **「渋谷区の飲食店」で検索された時に表示されるようにするには**
   - カテゴリーページ `/media/categories/渋谷区` を作成
   - または `/media/area/渋谷区/type/飲食店` のようなURL構造



