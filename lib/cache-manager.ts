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

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL; // デフォルト5分
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

// TTL定数（ミリ秒）
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1分
  MEDIUM: 5 * 60 * 1000,     // 5分
  LONG: 30 * 60 * 1000,      // 30分
  VERY_LONG: 60 * 60 * 1000, // 1時間
};

