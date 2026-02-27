/**
 * React cache() でデータ取得関数をラップし、
 * 同一リクエスト内（generateMetadata + Page）での重複Firestoreクエリを排除する。
 *
 * cache() はプリミティブ引数（string/number）の同一性で重複判定するため、
 * 主に getMediaIdFromHost, getArticleServer, getSiteInfo, getTheme 等で大きな効果がある。
 */
import { cache } from 'react';

import { getMediaIdFromHost as _getMediaIdFromHost, getSiteInfo as _getSiteInfo } from './media-tenant-helper';
import { getTheme as _getTheme } from './theme-helper';
import {
  getArticleServer as _getArticleServer,
  getPopularArticlesServer as _getPopularArticlesServer,
  getRecommendedArticlesServer as _getRecommendedArticlesServer,
  getRecentArticlesServer as _getRecentArticlesServer,
  getWriterServer as _getWriterServer,
} from './articles-server';
import {
  getCategoryServer as _getCategoryServer,
} from './categories-server';
import {
  getTagServer as _getTagServer,
} from './tags-server';

// 引数なし — 完全に重複排除される
export const getMediaIdFromHost = cache(_getMediaIdFromHost);

// string 引数 — generateMetadata と Page 間で確実に重複排除
export const getSiteInfo = cache((mediaId: string) => _getSiteInfo(mediaId));
export const getTheme = cache((mediaId: string) => _getTheme(mediaId));
export const getArticleServer = cache((slug: string, mediaId?: string) => _getArticleServer(slug, mediaId));
export const getPopularArticlesServer = cache((limitCount: number, mediaId?: string) => _getPopularArticlesServer(limitCount, mediaId));
export const getRecommendedArticlesServer = cache((limitCount: number, mediaId?: string) => _getRecommendedArticlesServer(limitCount, mediaId));
export const getRecentArticlesServer = cache((limitCount: number, mediaId?: string) => _getRecentArticlesServer(limitCount, mediaId));
export const getWriterServer = cache((writerId: string) => _getWriterServer(writerId));
export const getCategoryServer = cache((slug: string, mediaId?: string) => _getCategoryServer(slug, mediaId));
export const getTagServer = cache((slug: string, mediaId?: string) => _getTagServer(slug, mediaId));
