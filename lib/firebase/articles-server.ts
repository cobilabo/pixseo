import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { adminDb } from './admin';
import { Article } from '@/types/article';

// FirestoreのTimestampをDateに変換
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
};

// 記事を取得（サーバーサイド用）
export const getArticleServer = async (slug: string, mediaId?: string): Promise<Article | null> => {
  try {
    const articlesRef = adminDb.collection('articles');
    let query = articlesRef
      .where('slug', '==', slug)
      .where('isPublished', '==', true);
    
    // mediaIdが指定されている場合はフィルタリング
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId) as any;
    }
    
    const snapshot = await query.limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      publishedAt: convertTimestamp(data.publishedAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Article;
  } catch (error) {
    console.error('Error getting article:', error);
    return null;
  }
};

// 記事一覧を取得（サーバーサイド用）
export const getArticlesServer = async (
  options: {
    limit?: number;
    categoryId?: string;
    tagId?: string;
    mediaId?: string;
    orderBy?: 'publishedAt' | 'viewCount' | 'likeCount';
    orderDirection?: 'asc' | 'desc';
  } = {}
): Promise<Article[]> => {
  try {
    const articlesRef = adminDb.collection('articles');
    
    let q = articlesRef.where('isPublished', '==', true);
    
    // mediaIdが指定されている場合はフィルタリング
    if (options.mediaId) {
      q = q.where('mediaId', '==', options.mediaId) as any;
    }
    
    if (options.categoryId) {
      q = q.where('categoryIds', 'array-contains', options.categoryId) as any;
    }
    
    if (options.tagId) {
      q = q.where('tagIds', 'array-contains', options.tagId) as any;
    }
    
    // orderByは使わず、取得後にソートする（Firestoreの複合インデックス不足を回避）
    const snapshot = await q.get();
    
    let articles = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: convertTimestamp(data.publishedAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Article;
    });
    
    // 取得後にソート
    const orderField = options.orderBy || 'publishedAt';
    const orderDir = options.orderDirection || 'desc';
    
    articles.sort((a, b) => {
      const aValue = a[orderField] || 0;
      const bValue = b[orderField] || 0;
      
      if (orderField === 'publishedAt') {
        const aTime = (aValue as Date).getTime();
        const bTime = (bValue as Date).getTime();
        return orderDir === 'desc' ? bTime - aTime : aTime - bTime;
      } else {
        return orderDir === 'desc' 
          ? (bValue as number) - (aValue as number)
          : (aValue as number) - (bValue as number);
      }
    });
    
    // limit適用
    const limitCount = options.limit || 30;
    articles = articles.slice(0, limitCount);
    
    return articles;
  } catch (error) {
    console.error('[getArticlesServer] Error:', error);
    return [];
  }
};

// 新着記事を取得（サーバーサイド用）
export const getRecentArticlesServer = async (limitCount: number = 10, mediaId?: string): Promise<Article[]> => {
  return getArticlesServer({
    orderBy: 'publishedAt',
    orderDirection: 'desc',
    limit: limitCount,
    mediaId,
  });
};

// 人気記事を取得（サーバーサイド用）
export const getPopularArticlesServer = async (limitCount: number = 10, mediaId?: string): Promise<Article[]> => {
  return getArticlesServer({
    orderBy: 'viewCount',
    orderDirection: 'desc',
    limit: limitCount,
    mediaId,
  });
};

// 関連記事を取得（サーバーサイド用）
export const getRelatedArticlesServer = async (
  excludeArticleId: string,
  categoryIds: string[],
  tagIds: string[],
  limitCount: number = 6,
  mediaId?: string
): Promise<Article[]> => {
  try {
    const articlesRef = adminDb.collection('articles');
    let query = articlesRef.where('isPublished', '==', true);
    
    // mediaIdが指定されている場合はフィルタリング
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId) as any;
    }
    
    const snapshot = await query
      .orderBy('publishedAt', 'desc')
      .limit(limitCount * 2)
      .get();
    
    const articles = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          publishedAt: convertTimestamp(data.publishedAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Article;
      })
      .filter((article) => article.id !== excludeArticleId)
      .map((article) => {
        const categoryMatch = article.categoryIds.filter((id: string) =>
          categoryIds.includes(id)
        ).length;
        const tagMatch = article.tagIds.filter((id: string) =>
          tagIds.includes(id)
        ).length;
        return {
          ...article,
          relevanceScore: categoryMatch * 2 + tagMatch,
        };
      })
      .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore)
      .slice(0, limitCount)
      .map(({ relevanceScore, ...article }) => article);
    
    return articles;
  } catch (error) {
    console.error('Error getting related articles:', error);
    return [];
  }
};


