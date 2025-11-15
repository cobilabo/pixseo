import { searchClient, ARTICLES_INDEX } from './client';
import { Article } from '@/types/article';

export interface AlgoliaSearchOptions {
  keyword: string;
  mediaId?: string;
  page?: number;
  hitsPerPage?: number;
}

/**
 * Algoliaで記事を検索
 */
export async function searchArticlesWithAlgolia(
  options: AlgoliaSearchOptions
): Promise<{ articles: Partial<Article>[]; totalHits: number }> {
  const { keyword, mediaId, page = 0, hitsPerPage = 20 } = options;

  try {
    let filters = 'isPublished:true';

    // mediaIdでフィルタリング
    if (mediaId) {
      filters += ` AND mediaId:${mediaId}`;
    }

    console.log('[Algolia Search] Query:', keyword);
    console.log('[Algolia Search] Filters:', filters);
    console.log('[Algolia Search] MediaId:', mediaId);

    const result = await searchClient.searchSingleIndex({
      indexName: ARTICLES_INDEX,
      searchParams: {
        query: keyword,
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
      // カテゴリーとタグは別途取得が必要
    }));

    return {
      articles,
      totalHits: result.nbHits || 0,
    };
  } catch (error) {
    console.error('[Algolia] Search error:', error);
    return { articles: [], totalHits: 0 };
  }
}
