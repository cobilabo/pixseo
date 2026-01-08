import { adminDb } from './admin';
import { Tag } from '@/types/article';
import { cacheManager, generateCacheKey, CACHE_TTL } from '@/lib/cache-manager';

export const getTagsServer = async (mediaId?: string): Promise<Tag[]> => {
  try {
    // キャッシュキー生成
    const cacheKey = generateCacheKey('tags', mediaId || 'all');
    
    // キャッシュから取得
    const cached = cacheManager.get<Tag[]>(cacheKey, CACHE_TTL.LONG);
    if (cached) {
      return cached;
    }
    
    const tagsRef = adminDb.collection('tags');
    let q: FirebaseFirestore.Query = tagsRef;
    
    if (mediaId) {
      q = q.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await q.orderBy('name', 'asc').get();
    
    const tags = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as Tag;
    });
    
    // キャッシュに保存
    cacheManager.set(cacheKey, tags);
    
    return tags;
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
};

export const getTagServer = async (slug: string, mediaId?: string): Promise<Tag | null> => {
  try {
    // キャッシュキー生成
    const cacheKey = generateCacheKey('tag', slug, mediaId);
    
    // キャッシュから取得
    const cached = cacheManager.get<Tag>(cacheKey, CACHE_TTL.LONG);
    if (cached) {
      return cached;
    }
    
    const tagsRef = adminDb.collection('tags');
    let q: FirebaseFirestore.Query = tagsRef.where('slug', '==', slug);
    
    if (mediaId) {
      q = q.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await q.limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    const tag = {
      id: doc.id,
      ...data,
    } as Tag;
    
    // キャッシュに保存
    cacheManager.set(cacheKey, tag);
    
    return tag;
  } catch (error) {
    console.error('Error getting tag:', error);
    return null;
  }
};



