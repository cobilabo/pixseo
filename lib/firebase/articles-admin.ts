import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, initializeFirebase } from './config';
import { Article } from '@/types/article';

// クライアント側でFirebaseを初期化
if (typeof window !== 'undefined') {
  initializeFirebase();
}

/**
 * 記事の作成
 */
export const createArticle = async (articleData: Omit<Article, 'id' | 'publishedAt' | 'updatedAt' | 'viewCount' | 'likeCount'>): Promise<string> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, 'articles'), {
      ...articleData,
      publishedAt: now,
      updatedAt: now,
      viewCount: 0,
      likeCount: 0,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating article:', error);
    throw error;
  }
};

/**
 * 記事の更新
 */
export const updateArticle = async (id: string, articleData: Partial<Article>): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const articleRef = doc(db, 'articles', id);
    await updateDoc(articleRef, {
      ...articleData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating article:', error);
    throw error;
  }
};

/**
 * 記事の削除
 */
export const deleteArticle = async (id: string): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const articleRef = doc(db, 'articles', id);
    await deleteDoc(articleRef);
  } catch (error) {
    console.error('Error deleting article:', error);
    throw error;
  }
};

/**
 * 記事の取得（ID指定）
 */
export const getArticleById = async (id: string): Promise<Article | null> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const articleRef = doc(db, 'articles', id);
    const articleSnap = await getDoc(articleRef);

    if (!articleSnap.exists()) {
      return null;
    }

    const data = articleSnap.data();
    return {
      id: articleSnap.id,
      ...data,
      publishedAt: data.publishedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Article;
  } catch (error) {
    console.error('Error getting article:', error);
    throw error;
  }
};

/**
 * 全記事の取得（管理画面用）
 */
export const getAllArticles = async (): Promise<Article[]> => {
  // 確実に初期化
  initializeFirebase();
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const articlesRef = collection(db, 'articles');
    const querySnapshot = await getDocs(articlesRef);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Article;
    });
  } catch (error) {
    console.error('[getAllArticles] Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 記事の検索（タイトル・本文）
 */
export const searchArticles = async (searchTerm: string): Promise<Article[]> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    // Firestoreでは部分一致検索が難しいため、全記事を取得してフィルタリング
    const articles = await getAllArticles();
    const lowercaseSearch = searchTerm.toLowerCase();

    return articles.filter((article) => {
      const titleMatch = article.title.toLowerCase().includes(lowercaseSearch);
      const contentMatch = article.content.toLowerCase().includes(lowercaseSearch);
      return titleMatch || contentMatch;
    });
  } catch (error) {
    console.error('Error searching articles:', error);
    throw error;
  }
};

