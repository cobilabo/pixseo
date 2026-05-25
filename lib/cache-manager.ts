/**
 * サーバーサイドメモリキャッシュ
 * Firestoreクエリの結果をキャッシュして高速化
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 10 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL; // デフォルト10分
  }

  /**
   * キャッシュから取得
   */
  get<T>(key: string, ttl?: number): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const cacheTTL = ttl || this.defaultTTL;
    const isExpired = Date.now() - entry.timestamp > cacheTTL;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * キャッシュに保存
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * キャッシュをクリア
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * パターンに一致するキーをすべてクリア
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * すべてのキャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュサイズを取得
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュ統計を取得
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// シングルトンインスタンス
export const cacheManager = new CacheManager();

// キャッシュキー生成ヘルパー
export const generateCacheKey = (...parts: (string | number | undefined)[]): string => {
  return parts.filter(Boolean).join(':');
};

/** ライター更新APIなどから呼び出し、公開側 getWriterServer のメモリキャッシュを無効化する */
export function invalidateWriterServerCache(writerId: string): void {
  cacheManager.delete(generateCacheKey('writer', writerId));
}

// TTL定数（ミリ秒）
export const CACHE_TTL = {
  SHORT: 3 * 60 * 1000,      // 3分
  MEDIUM: 10 * 60 * 1000,    // 10分
  LONG: 30 * 60 * 1000,      // 30分
  VERY_LONG: 60 * 60 * 1000, // 1時間
};

/**
 * Vercel ISR キャッシュ即時無効化ヘルパー
 *
 * ページ側の `export const revalidate` を長め（30分〜1時間）に設定した上で、
 * 更新 API からこれらを呼ぶことで
 *   - 通常時: CDN / ISR キャッシュヒットで Firestore 呼び出しゼロ
 *   - 更新時: 即座にキャッシュ無効化 → 次回アクセスで再生成
 * の両立を実現する。
 *
 * revalidatePath は next/cache に依存するため、このヘルパー群は
 * Route Handler / Server Action からのみ呼ぶこと。
 */
import { revalidatePath, revalidateTag } from 'next/cache';
import { SUPPORTED_LANGS } from '@/types/lang';
import { CACHE_TAGS } from './firebase/cached';

/** next.config.js の trailingSlash: true に合わせる */
const withTrailingSlash = (path: string): string =>
  path.endsWith('/') ? path : `${path}/`;

const runRevalidate = (path: string, type?: 'page' | 'layout') => {
  const normalized = withTrailingSlash(path);
  try {
    if (type) {
      revalidatePath(normalized, type);
    } else {
      revalidatePath(normalized);
    }
  } catch (error) {
    console.warn('[revalidate] failed to revalidate ' + normalized, error);
  }
};

const runRevalidateTag = (tag: string) => {
  try {
    revalidateTag(tag);
  } catch (error) {
    console.warn('[revalidateTag] failed to revalidate tag ' + tag, error);
  }
};

export function revalidateArticle(slug?: string | null): void {
  // Vercel Data Cache (unstable_cache) の粒度無効化
  runRevalidateTag(CACHE_TAGS.ARTICLES);

  SUPPORTED_LANGS.forEach((lang) => {
    runRevalidate('/' + lang);
    runRevalidate('/' + lang + '/articles');
    if (slug) {
      runRevalidate('/' + lang + '/articles/' + slug);
    }
  });
  // sitemap は trailingSlash 対象外
  runRevalidate('/sitemap.xml');
}

export function revalidateCategorySlug(slug?: string | null): void {
  runRevalidateTag(CACHE_TAGS.CATEGORIES);
  runRevalidateTag(CACHE_TAGS.ARTICLES);

  SUPPORTED_LANGS.forEach((lang) => {
    runRevalidate('/' + lang);
    runRevalidate('/' + lang + '/articles');
    if (slug) {
      runRevalidate('/' + lang + '/categories/' + slug);
    }
  });
  runRevalidate('/sitemap.xml');
}

export function revalidateTagSlug(slug?: string | null): void {
  runRevalidateTag(CACHE_TAGS.TAGS);
  runRevalidateTag(CACHE_TAGS.ARTICLES);

  SUPPORTED_LANGS.forEach((lang) => {
    runRevalidate('/' + lang);
    runRevalidate('/' + lang + '/articles');
    if (slug) {
      runRevalidate('/' + lang + '/tags/' + slug);
    }
  });
  runRevalidate('/sitemap.xml');
}

export function revalidateCustomPage(slug?: string | null): void {
  runRevalidateTag(CACHE_TAGS.SITE);

  SUPPORTED_LANGS.forEach((lang) => {
    if (slug) {
      runRevalidate('/' + lang + '/' + slug);
    }
  });
  runRevalidate('/sitemap.xml');
}

export function revalidateSite(): void {
  runRevalidateTag(CACHE_TAGS.SITE);
  runRevalidateTag(CACHE_TAGS.THEME);

  SUPPORTED_LANGS.forEach((lang) => {
    runRevalidate('/' + lang, 'layout');
  });
  runRevalidate('/sitemap.xml');
}

/**
 * ライター更新 API などから呼び出して、ライター系のキャッシュを粒度無効化する。
 * 記事一覧にはライター情報が含まれるため articles タグも一緒に無効化。
 */
export function revalidateWriter(writerId?: string | null): void {
  runRevalidateTag(CACHE_TAGS.WRITERS);
  runRevalidateTag(CACHE_TAGS.ARTICLES);

  SUPPORTED_LANGS.forEach((lang) => {
    if (writerId) {
      runRevalidate('/' + lang + '/writers/' + writerId);
    }
  });
}

/**
 * 検索ログ（サイドバーの人気検索タグ等）を強制的に再集計させたいときに呼ぶ。
 * 通常は cron / 日次バッチで自然に revalidate されるので使わなくて良い。
 */
export function revalidateSearchLogs(): void {
  runRevalidateTag(CACHE_TAGS.SEARCH_LOGS);
}

/**
 * よく検索されているキーワードの承認状態が変わったときに呼ぶ。
 * サイト側 SSR の `getApprovedPopularKeywordsServer` キャッシュを即時無効化する。
 */
export function revalidatePopularKeywords(): void {
  runRevalidateTag(CACHE_TAGS.POPULAR_KEYWORDS);

  SUPPORTED_LANGS.forEach((lang) => {
    runRevalidate('/' + lang, 'layout');
  });
}

