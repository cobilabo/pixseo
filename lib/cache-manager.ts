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
import { revalidatePath } from 'next/cache';
import { SUPPORTED_LANGS } from '@/types/lang';

const runRevalidate = (path: string, type?: 'page' | 'layout') => {
  try {
    if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
  } catch (error) {
    console.warn('[revalidate] failed to revalidate ' + path, error);
  }
};

export function revalidateArticle(slug?: string | null): void {
  SUPPORTED_LANGS.forEach((lang) => {
    runRevalidate('/' + lang);
    runRevalidate('/' + lang + '/articles');
    if (slug) {
      runRevalidate('/' + lang + '/articles/' + slug);
    }
  });
  runRevalidate('/sitemap.xml');
}

export function revalidateCategorySlug(slug?: string | null): void {
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
  SUPPORTED_LANGS.forEach((lang) => {
    if (slug) {
      runRevalidate('/' + lang + '/' + slug);
    }
  });
  runRevalidate('/sitemap.xml');
}

export function revalidateSite(): void {
  SUPPORTED_LANGS.forEach((lang) => {
    runRevalidate('/' + lang, 'layout');
  });
  runRevalidate('/sitemap.xml');
}

