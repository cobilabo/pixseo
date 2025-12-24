import { searchClient, getArticlesIndexName } from './client';
import { Article } from '@/types/article';
import { Lang } from '@/types/lang';

export interface AlgoliaSearchOptions {
  keyword?: string;
  tagName?: string;       // タグ名で検索（Algoliaに保存されているタグ名）
  categoryName?: string;  // カテゴリー名で検索
  lang: Lang;
  mediaId?: string;
  page?: number;
  hitsPerPage?: number;
}

/**
 * Algoliaで記事を検索（言語別インデックス）
 * キーワード検索またはタグ/カテゴリーフィルターで検索可能
 */
export async function searchArticlesWithAlgolia(
  options: AlgoliaSearchOptions
): Promise<{ articles: Partial<Article>[]; totalHits: number; searchType: 'keyword' | 'tag' | 'category' }> {
  const { keyword, tagName, categoryName, lang, mediaId, page = 0, hitsPerPage = 20 } = options;

  try {
    let filters = 'isPublished:true';

    // mediaIdでフィルタリング
    if (mediaId) {
      filters += ` AND mediaId:${mediaId}`;
    }

    // タグでフィルタリング（tagsフィールドに対してフィルター）
    if (tagName) {
      filters += ` AND tags:"${tagName}"`;
    }

    // カテゴリーでフィルタリング（categoriesフィールドに対してフィルター）
    if (categoryName) {
      filters += ` AND categories:"${categoryName}"`;
    }

    // 言語別インデックスを使用
    const indexName = getArticlesIndexName(lang);

    // 検索タイプを判定
    const searchType: 'keyword' | 'tag' | 'category' = tagName ? 'tag' : categoryName ? 'category' : 'keyword';

    console.log('[Algolia Search] Query:', keyword || '(empty)');
    console.log('[Algolia Search] Index:', indexName);
    console.log('[Algolia Search] Filters:', filters);
    console.log('[Algolia Search] MediaId:', mediaId);
    console.log('[Algolia Search] SearchType:', searchType);
    if (tagName) console.log('[Algolia Search] TagName:', tagName);
    if (categoryName) console.log('[Algolia Search] CategoryName:', categoryName);

    const result = await searchClient.searchSingleIndex({
      indexName,
      searchParams: {
        query: keyword || '',  // タグ/カテゴリー検索時はキーワードは空でもOK
        page,
        hitsPerPage,
        filters,
      },
    });

    console.log('[Algolia Search] Results:', result.nbHits, 'hits');

    const articles = result.hits.map((hit: any) => ({
      id: hit.objectID,
      title: hit.title,
      slug: hit.slug,
      excerpt: hit.excerpt,
      mediaId: hit.mediaId,
      publishedAt: new Date(hit.publishedAt),
      isPublished: hit.isPublished,
      featuredImage: hit.featuredImage,
      featuredImageAlt: hit.featuredImageAlt,
      viewCount: hit.viewCount || 0,
      categories: hit.categories || [],
      tags: hit.tags || [],
    }));

    return {
      articles,
      totalHits: result.nbHits || 0,
      searchType,
    };
  } catch (error) {
    console.error('[Algolia] Search error:', error);
    return { articles: [], totalHits: 0, searchType: 'keyword' };
  }
}
