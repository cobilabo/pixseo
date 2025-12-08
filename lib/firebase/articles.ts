import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { Article } from '@/types/article';

// FirestoreのTimestampをDateに変換
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// 記事を取得
export const getArticle = async (slug: string): Promise<Article | null> => {
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return null;
    }
    
    const articlesRef = collection(db, 'articles');
    const q = query(articlesRef, where('slug', '==', slug), where('isPublished', '==', true));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnapshot = querySnapshot.docs[0];
    const data = docSnapshot.data();
    
    const article = {
      id: docSnapshot.id,
      ...data,
      publishedAt: convertTimestamp(data.publishedAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Article;
    
    // 公開日が未来の場合は表示しない（予約公開記事の安全策）
    const now = new Date();
    if (article.publishedAt && article.publishedAt > now) {
      return null;
    }
    
    return article;
  } catch (error) {
    console.error('Error getting article:', error);
    return null;
  }
};

// 記事一覧を取得
export const getArticles = async (
  options: {
    limit?: number;
    categoryId?: string;
    tagId?: string;
    orderBy?: 'publishedAt' | 'viewCount' | 'likeCount';
    orderDirection?: 'asc' | 'desc';
  } = {}
): Promise<Article[]> => {
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return [];
    }
    
    const articlesRef = collection(db, 'articles');
    let q = query(articlesRef, where('isPublished', '==', true));
    
    if (options.categoryId) {
      q = query(q, where('categoryIds', 'array-contains', options.categoryId));
    }
    
    if (options.tagId) {
      q = query(q, where('tagIds', 'array-contains', options.tagId));
    }
    
    const orderField = options.orderBy || 'publishedAt';
    const orderDir = options.orderDirection || 'desc';
    q = query(q, orderBy(orderField, orderDir));
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    return querySnapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          publishedAt: convertTimestamp(data.publishedAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Article;
      })
      // 公開日が現在日時以下の記事のみを表示（予約公開記事を除外）
      .filter(article => !article.publishedAt || article.publishedAt <= now);
  } catch (error) {
    console.error('Error getting articles:', error);
    return [];
  }
};

// 人気記事を取得
export const getPopularArticles = async (limitCount: number = 10): Promise<Article[]> => {
  return getArticles({
    orderBy: 'viewCount',
    orderDirection: 'desc',
    limit: limitCount,
  });
};

// 新着記事を取得
export const getRecentArticles = async (limitCount: number = 10): Promise<Article[]> => {
  return getArticles({
    orderBy: 'publishedAt',
    orderDirection: 'desc',
    limit: limitCount,
  });
};

// すべての記事のslugを取得（静的生成用）
export const getAllArticleSlugs = async (): Promise<string[]> => {
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return [];
    }
    
    const articlesRef = collection(db, 'articles');
    const q = query(articlesRef, where('isPublished', '==', true));
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    return querySnapshot.docs
      .filter((docSnapshot) => {
        const data = docSnapshot.data();
        const publishedAt = convertTimestamp(data.publishedAt);
        // 公開日が現在日時以下の記事のみ
        return publishedAt <= now;
      })
      .map((docSnapshot) => {
        const data = docSnapshot.data();
        return data.slug as string;
      });
  } catch (error) {
    console.error('Error getting article slugs:', error);
    return [];
  }
};

// 関連記事を取得
export const getRelatedArticles = async (
  excludeArticleId: string,
  categoryIds: string[],
  tagIds: string[],
  limitCount: number = 6
): Promise<Article[]> => {
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return [];
    }
    
    const articlesRef = collection(db, 'articles');
    
    // カテゴリーまたはタグが一致する記事を取得
    let q = query(
      articlesRef,
      where('isPublished', '==', true),
      orderBy('publishedAt', 'desc'),
      limit(limitCount * 2) // より多く取得してからフィルタリング
    );
    
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    // 関連度でソート（カテゴリー・タグの一致数が多い順）
    const articles = querySnapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          publishedAt: convertTimestamp(data.publishedAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Article;
      })
      .filter((article) => article.id !== excludeArticleId)
      // 公開日が現在日時以下の記事のみ
      .filter((article) => !article.publishedAt || article.publishedAt <= now)
      .map((article) => {
        // 関連度スコアを計算
        const categoryMatch = article.categoryIds.filter((id: string) =>
          categoryIds.includes(id)
        ).length;
        const tagMatch = article.tagIds.filter((id: string) =>
          tagIds.includes(id)
        ).length;
        return {
          ...article,
          relevanceScore: categoryMatch * 2 + tagMatch, // カテゴリーの方が重要
        };
      })
      .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore)
      .slice(0, limitCount)
      .map(({ relevanceScore, ...article }) => article); // スコアを削除
    
    return articles;
  } catch (error) {
    console.error('Error getting related articles:', error);
    return [];
  }
};

