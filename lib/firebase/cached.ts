/**
 * データ取得関数を 2 段のキャッシュでラップする。
 *
 *   1. React cache()         : 同一リクエスト内で重複クエリを排除
 *   2. Next.js unstable_cache: Vercel Data Cache (全インスタンス共有 / 永続) で
 *                              記事・カテゴリ・タグ・ライター等のリスト系を長期キャッシュ。
 *                              更新 API 側から revalidateTag() で即時無効化する。
 *
 * プレビューモードでは unstable_cache を経由せず、下位関数を直接呼び出す。
 * （プレビューはエディターが直近で書き込んだデータを即座に見たいため）
 */
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import {
  getMediaIdFromHost as _getMediaIdFromHost,
  getSiteInfo as _getSiteInfo,
  isPreviewMode,
} from './media-tenant-helper';
import { getTheme as _getTheme } from './theme-helper';
import {
  getArticleServer as _getArticleServer,
  getArticlesServer as _getArticlesServer,
  getPopularArticlesServer as _getPopularArticlesServer,
  getRecommendedArticlesServer as _getRecommendedArticlesServer,
  getRecentArticlesServer as _getRecentArticlesServer,
  getWriterServer as _getWriterServer,
  getSliderArticlesServer as _getSliderArticlesServer,
  getRelatedArticlesServer as _getRelatedArticlesServer,
  getArticlesCountServer as _getArticlesCountServer,
  getArticlesByWriterServer as _getArticlesByWriterServer,
} from './articles-server';

type ArticlesServerOptions = Parameters<typeof _getArticlesServer>[0];
import {
  getCategoryServer as _getCategoryServer,
  getCategoriesServer as _getAllCategoriesServer,
  getCategoriesWithCountServer as _getCategoriesWithCountServer,
} from './categories-server';

type AllCategoriesOptions = Parameters<typeof _getAllCategoriesServer>[0];
type CategoriesWithCountOptions = Parameters<typeof _getCategoriesWithCountServer>[0];
import {
  getTagServer as _getTagServer,
  getTagsServer as _getAllTagsServer,
} from './tags-server';
import { getPopularSearchTagsServer as _getPopularSearchTagsServer } from './search-log-server';
import type { Article } from '@/types/article';
import type { Writer } from '@/types/writer';

/**
 * 更新 API 側で revalidateTag() から参照されるキャッシュタグ定数。
 * 粒度の指針:
 *   - ARTICLES: 記事一覧 / 関連 / 人気 / 新着 / おすすめ / sitemap 系
 *   - CATEGORIES / TAGS / WRITERS / SITE: それぞれの更新で無効化される
 *   - SEARCH_LOGS: 検索ログ集計（人気検索タグ等）
 */
export const CACHE_TAGS = {
  ARTICLES: 'articles',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  WRITERS: 'writers',
  SITE: 'site',
  SEARCH_LOGS: 'search-logs',
  THEME: 'theme',
} as const;

// Vercel Data Cache の既定 TTL（CDN ミス時でもこれだけの間は Firestore を叩かない）
const TTL = {
  SHORT: 300,      // 5分
  MEDIUM: 1800,    // 30分
  LONG: 3600,      // 1時間
  VERY_LONG: 21600 // 6時間
};

// ---------- プレビュー非対応 / 低頻度更新: 単純に unstable_cache でラップ ----------

const cachedAllCategories = unstable_cache(
  async (options: AllCategoriesOptions) => _getAllCategoriesServer(options),
  ['all-categories-v1'],
  { tags: [CACHE_TAGS.CATEGORIES], revalidate: TTL.LONG }
);

const cachedCategoriesWithCount = unstable_cache(
  async (options: CategoriesWithCountOptions) => _getCategoriesWithCountServer(options),
  ['categories-with-count-v1'],
  { tags: [CACHE_TAGS.CATEGORIES, CACHE_TAGS.ARTICLES], revalidate: TTL.MEDIUM }
);

const cachedAllTags = unstable_cache(
  async (mediaId?: string) => _getAllTagsServer(mediaId),
  ['all-tags-v1'],
  { tags: [CACHE_TAGS.TAGS], revalidate: TTL.LONG }
);

const cachedCategory = unstable_cache(
  async (slug: string, mediaId?: string) => _getCategoryServer(slug, mediaId),
  ['category-v1'],
  { tags: [CACHE_TAGS.CATEGORIES], revalidate: TTL.LONG }
);

const cachedTag = unstable_cache(
  async (slug: string, mediaId?: string) => _getTagServer(slug, mediaId),
  ['tag-v1'],
  { tags: [CACHE_TAGS.TAGS], revalidate: TTL.LONG }
);

const cachedWriter = unstable_cache(
  async (writerId: string) => _getWriterServer(writerId),
  ['writer-v1'],
  { tags: [CACHE_TAGS.WRITERS], revalidate: TTL.LONG }
);

const cachedSiteInfo = unstable_cache(
  async (mediaId: string) => _getSiteInfo(mediaId),
  ['site-info-v1'],
  { tags: [CACHE_TAGS.SITE], revalidate: TTL.LONG }
);

const cachedTheme = unstable_cache(
  async (mediaId: string) => _getTheme(mediaId),
  ['theme-v1'],
  { tags: [CACHE_TAGS.THEME, CACHE_TAGS.SITE], revalidate: TTL.LONG }
);

const cachedPopularSearchTags = unstable_cache(
  async (mediaId: string, days: number, limitCount: number) =>
    _getPopularSearchTagsServer(mediaId, days, limitCount),
  ['popular-search-tags-v1'],
  { tags: [CACHE_TAGS.SEARCH_LOGS], revalidate: TTL.MEDIUM }
);

const cachedSliderArticles = unstable_cache(
  async (mediaId?: string) => _getSliderArticlesServer(mediaId),
  ['slider-articles-v1'],
  { tags: [CACHE_TAGS.ARTICLES], revalidate: TTL.MEDIUM }
);

const cachedArticlesByWriter = unstable_cache(
  async (writerId: string, mediaId: string | undefined, limitCount: number) =>
    _getArticlesByWriterServer(writerId, mediaId, limitCount),
  ['articles-by-writer-v1'],
  { tags: [CACHE_TAGS.ARTICLES, CACHE_TAGS.WRITERS], revalidate: TTL.MEDIUM }
);

// ---------- プレビュー対応: ライブ時のみ unstable_cache を通す ----------

const cachedPopularArticlesLive = unstable_cache(
  async (limitCount: number, mediaId?: string) => _getPopularArticlesServer(limitCount, mediaId),
  ['popular-articles-live-v1'],
  { tags: [CACHE_TAGS.ARTICLES], revalidate: TTL.MEDIUM }
);

const cachedRecentArticlesLive = unstable_cache(
  async (limitCount: number, mediaId?: string) => _getRecentArticlesServer(limitCount, mediaId),
  ['recent-articles-live-v1'],
  { tags: [CACHE_TAGS.ARTICLES], revalidate: TTL.MEDIUM }
);

const cachedRecommendedArticlesLive = unstable_cache(
  async (limitCount: number, mediaId?: string) => _getRecommendedArticlesServer(limitCount, mediaId),
  ['recommended-articles-live-v1'],
  { tags: [CACHE_TAGS.ARTICLES, CACHE_TAGS.CATEGORIES], revalidate: TTL.MEDIUM }
);

const cachedArticleLive = unstable_cache(
  async (slug: string, mediaId?: string) => _getArticleServer(slug, mediaId),
  ['article-live-v1'],
  { tags: [CACHE_TAGS.ARTICLES], revalidate: TTL.LONG }
);

const cachedRelatedArticlesLive = unstable_cache(
  async (article: Article, limitCount: number, mediaId?: string) =>
    _getRelatedArticlesServer(article, limitCount, mediaId),
  ['related-articles-live-v1'],
  { tags: [CACHE_TAGS.ARTICLES], revalidate: TTL.MEDIUM }
);

const cachedArticlesCountLive = unstable_cache(
  async (mediaId?: string) => _getArticlesCountServer(mediaId),
  ['articles-count-live-v1'],
  { tags: [CACHE_TAGS.ARTICLES], revalidate: TTL.MEDIUM }
);

const cachedArticlesListLive = unstable_cache(
  async (options: ArticlesServerOptions) => _getArticlesServer(options),
  ['articles-list-live-v1'],
  { tags: [CACHE_TAGS.ARTICLES], revalidate: TTL.MEDIUM }
);

// ---------- 公開エクスポート: React cache() で同一リクエスト内重複も排除 ----------

// 引数なし
export const getMediaIdFromHost = cache(_getMediaIdFromHost);

// プレビュー非対応 / 低頻度更新
export const getSiteInfo = cache((mediaId: string) => cachedSiteInfo(mediaId));
export const getTheme = cache((mediaId: string) => cachedTheme(mediaId));
export const getCategoryServer = cache((slug: string, mediaId?: string) => cachedCategory(slug, mediaId));
export const getTagServer = cache((slug: string, mediaId?: string) => cachedTag(slug, mediaId));
export const getWriterServer = cache((writerId: string) => cachedWriter(writerId));
export const getAllCategoriesServer = cache((options: AllCategoriesOptions = {}) => cachedAllCategories(options));
export const getCategoriesWithCountServer = cache((options: CategoriesWithCountOptions = {}) => cachedCategoriesWithCount(options));
export const getAllTagsServer = cache((mediaId?: string) => cachedAllTags(mediaId));
export const getPopularSearchTagsServer = cache(
  (mediaId: string, days: number = 30, limitCount: number = 10) =>
    cachedPopularSearchTags(mediaId, days, limitCount)
);
export const getSliderArticlesServer = cache((mediaId?: string) => cachedSliderArticles(mediaId));
export const getArticlesByWriterServer = cache(
  (writerId: string, mediaId?: string, limitCount: number = 20) =>
    cachedArticlesByWriter(writerId, mediaId, limitCount)
);

// プレビュー対応: ライブ時のみ unstable_cache、プレビュー時は直呼び
export const getArticleServer = cache((slug: string, mediaId?: string) =>
  isPreviewMode() ? _getArticleServer(slug, mediaId) : cachedArticleLive(slug, mediaId)
);

export const getPopularArticlesServer = cache((limitCount: number, mediaId?: string) =>
  isPreviewMode() ? _getPopularArticlesServer(limitCount, mediaId) : cachedPopularArticlesLive(limitCount, mediaId)
);

export const getRecommendedArticlesServer = cache((limitCount: number, mediaId?: string) =>
  isPreviewMode() ? _getRecommendedArticlesServer(limitCount, mediaId) : cachedRecommendedArticlesLive(limitCount, mediaId)
);

export const getRecentArticlesServer = cache((limitCount: number, mediaId?: string) =>
  isPreviewMode() ? _getRecentArticlesServer(limitCount, mediaId) : cachedRecentArticlesLive(limitCount, mediaId)
);

export const getRelatedArticlesServer = cache((article: Article, limitCount: number = 6, mediaId?: string) =>
  isPreviewMode() ? _getRelatedArticlesServer(article, limitCount, mediaId) : cachedRelatedArticlesLive(article, limitCount, mediaId)
);

export const getArticlesCountServer = cache((mediaId?: string) =>
  isPreviewMode() ? _getArticlesCountServer(mediaId) : cachedArticlesCountLive(mediaId)
);

export const getArticlesServer = cache((options: ArticlesServerOptions = {}) =>
  isPreviewMode() ? _getArticlesServer(options) : cachedArticlesListLive(options)
);

// 型再エクスポート（ページ側で import しやすくするため）
export type { Article, Writer };
