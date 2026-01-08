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



