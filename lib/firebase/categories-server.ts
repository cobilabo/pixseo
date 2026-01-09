import { adminDb } from './admin';
import { Category } from '@/types/article';
import { cacheManager, generateCacheKey, CACHE_TTL } from '@/lib/cache-manager';

export const getCategoriesServer = async (
  options: {
    isRecommended?: boolean;
    mediaId?: string;
  } = {}
): Promise<Category[]> => {
  try {
    // キャッシュキー生成
    const cacheKey = generateCacheKey('categories', options.mediaId, options.isRecommended ? 'recommended' : 'all');
    
    // キャッシュから取得
    const cached = cacheManager.get<Category[]>(cacheKey, CACHE_TTL.LONG);
    if (cached) {
      return cached;
    }
    
    const categoriesRef = adminDb.collection('categories');
    let q: FirebaseFirestore.Query = categoriesRef;
    
    if (options.mediaId) {
      q = q.where('mediaId', '==', options.mediaId);
    }
    
    if (options.isRecommended) {
      q = q.where('isRecommended', '==', true);
    }
    
    const snapshot = await q.orderBy('order', 'asc').get();
    
    const categories = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as Category;
    });
    
    // キャッシュに保存
    cacheManager.set(cacheKey, categories);
    
    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

// カテゴリーの記事数を取得
export interface CategoryWithCount extends Category {
  articleCount: number;
}

export const getCategoriesWithCountServer = async (
  options: {
    mediaId?: string;
  } = {}
): Promise<CategoryWithCount[]> => {
  try {
    // キャッシュキー生成
    const cacheKey = generateCacheKey('categories-with-count', options.mediaId || 'all');
    
    // キャッシュから取得
    const cached = cacheManager.get<CategoryWithCount[]>(cacheKey, CACHE_TTL.MEDIUM);
    if (cached) {
      return cached;
    }
    
    // カテゴリーを取得
    const categories = await getCategoriesServer({ mediaId: options.mediaId });
    
    // 各カテゴリーの記事数を取得
    const articlesRef = adminDb.collection('articles');
    let articlesQuery: FirebaseFirestore.Query = articlesRef
      .where('status', '==', 'published');
    
    if (options.mediaId) {
      articlesQuery = articlesQuery.where('mediaId', '==', options.mediaId);
    }
    
    const articlesSnapshot = await articlesQuery.get();
    
    // カテゴリーIDごとの記事数をカウント
    const countByCategory: Record<string, number> = {};
    articlesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const categoryIds = data.categoryIds || [];
      categoryIds.forEach((catId: string) => {
        countByCategory[catId] = (countByCategory[catId] || 0) + 1;
      });
    });
    
    // カテゴリーに記事数を追加
    const categoriesWithCount: CategoryWithCount[] = categories.map(cat => ({
      ...cat,
      articleCount: countByCategory[cat.id] || 0,
    }));
    
    // キャッシュに保存
    cacheManager.set(cacheKey, categoriesWithCount);
    
    return categoriesWithCount;
  } catch (error) {
    console.error('Error getting categories with count:', error);
    return [];
  }
};

export const getCategoryServer = async (slug: string, mediaId?: string): Promise<Category | null> => {
  try {
    // キャッシュキー生成
    const cacheKey = generateCacheKey('category', slug, mediaId);
    
    // キャッシュから取得
    const cached = cacheManager.get<Category>(cacheKey, CACHE_TTL.LONG);
    if (cached) {
      return cached;
    }
    
    const categoriesRef = adminDb.collection('categories');
    let q: FirebaseFirestore.Query = categoriesRef.where('slug', '==', slug);
    
    if (mediaId) {
      q = q.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await q.limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    const category = {
      id: doc.id,
      ...data,
    } as Category;
    
    // キャッシュに保存
    cacheManager.set(cacheKey, category);
    
    return category;
  } catch (error) {
    console.error('Error getting category:', error);
    return null;
  }
};



