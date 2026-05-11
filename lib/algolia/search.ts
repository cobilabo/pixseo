import type { SupportedLanguage } from '@algolia/client-search';
import { searchClient, getArticlesIndexName } from './client';
import { Article } from '@/types/article';
import { Lang } from '@/types/lang';

const QUERY_LANGUAGE_BY_SITE_LANG: Record<Lang, SupportedLanguage> = {
  ja: 'ja',
  en: 'en',
  zh: 'zh',
  ko: 'ko',
};

export interface AlgoliaSearchOptions {
  keyword?: string;
  tagName?: string;       // タグ名で検索（Algoliaに保存されているタグ名）
  categoryName?: string;  // カテゴリー名で検索
  lang: Lang;
  mediaId?: string;
  page?: number;
  hitsPerPage?: number;
  /**
   * 公開記事のみ取得するか（デフォルト true）。
   * 管理画面で未公開記事も検索したいケース等では false を渡す。
   */
  isPublishedOnly?: boolean;
}

/**
 * Algoliaで記事を検索（言語別インデックス）
 * キーワード検索またはタグ/カテゴリーフィルターで検索可能
 */
export async function searchArticlesWithAlgolia(
  options: AlgoliaSearchOptions
): Promise<{ articles: Partial<Article>[]; totalHits: number; searchType: 'keyword' | 'tag' | 'category' }> {
  const { keyword, tagName, categoryName, lang, mediaId, page = 0, hitsPerPage = 20, isPublishedOnly = true } = options;
  const trimmedKeyword = (keyword ?? '').trim();
  /** キーワードのみの検索（タグ/カテゴリフィルター時は従来どおり） */
  const isKeywordOnlySearch = Boolean(trimmedKeyword) && !tagName && !categoryName;

  try {
    const filterParts: string[] = [];
    if (isPublishedOnly) {
      filterParts.push('isPublished:true');
    }
    if (mediaId) {
      filterParts.push(`mediaId:${mediaId}`);
    }
    if (tagName) {
      filterParts.push(`tags:"${tagName}"`);
    }
    if (categoryName) {
      filterParts.push(`categories:"${categoryName}"`);
    }
    const filters = filterParts.join(' AND ');

    // 言語別インデックスを使用
    const indexName = getArticlesIndexName(lang);

    // 検索タイプを判定
    const searchType: 'keyword' | 'tag' | 'category' = tagName ? 'tag' : categoryName ? 'category' : 'keyword';

    console.log('[Algolia Search] Query:', keyword || '(empty)');
    console.log('[Algolia Search] Index:', indexName);
    console.log('[Algolia Search] Filters:', filters || '(none)');
    console.log('[Algolia Search] MediaId:', mediaId);
    console.log('[Algolia Search] SearchType:', searchType);
    if (tagName) console.log('[Algolia Search] TagName:', tagName);
    if (categoryName) console.log('[Algolia Search] CategoryName:', categoryName);

    const result = await searchClient.searchSingleIndex({
      indexName,
      searchParams: {
        // 管理画面は title/content の部分一致に近いため、フレーズ検索は使わず通常クエリ（完全一致にはならない）
        query: isKeywordOnlySearch ? trimmedKeyword : (keyword || ''),
        page,
        hitsPerPage,
        ...(filters ? { filters } : {}),
        ...(isKeywordOnlySearch
          ? {
              restrictSearchableAttributes: ['title', 'contentText', 'contentTextChunks'],
              queryLanguages: [QUERY_LANGUAGE_BY_SITE_LANG[lang]],
            }
          : {}),
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
