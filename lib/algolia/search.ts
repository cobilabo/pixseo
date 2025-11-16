import { searchClient, getArticlesIndexName } from './client';
import { Article } from '@/types/article';
import { Lang } from '@/types/lang';

export interface AlgoliaSearchOptions {
  keyword: string;
  lang: Lang;
  mediaId?: string;
  page?: number;
  hitsPerPage?: number;
}

/**
 * Algoliaで記事を検索（言語別インデックス）
 */
export async function searchArticlesWithAlgolia(
  options: AlgoliaSearchOptions
): Promise<{ articles: Partial<Article>[]; totalHits: number }> {
  const { keyword, lang, mediaId, page = 0, hitsPerPage = 20 } = options;

  try {
    let filters = 'isPublished:true';

    // mediaIdでフィルタリング
    if (mediaId) {
      filters += ` AND mediaId:${mediaId}`;
    }

    // 言語別インデックスを使用
    const indexName = getArticlesIndexName(lang);

    console.log('[Algolia Search] Query:', keyword);
    console.log('[Algolia Search] Index:', indexName);
    console.log('[Algolia Search] Filters:', filters);
    console.log('[Algolia Search] MediaId:', mediaId);

    const result = await searchClient.searchSingleIndex({
      indexName,
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
      featuredImage: hit.featuredImage,
      featuredImageAlt: hit.featuredImageAlt,
      viewCount: hit.viewCount || 0,
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
