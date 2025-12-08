import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from './config';
import { Article } from '@/types/article';
import { recordSearch } from './search-history';

interface SearchOptions {
  keyword?: string;
  categoryId?: string;
  tagId?: string;
  limitCount?: number;
}

// FirestoreのTimestampをDateに変換
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export const searchArticles = async (
  options: SearchOptions = {}
): Promise<Article[]> => {
  // 検索履歴を記録（非同期で実行、エラーは無視）
  if (options.keyword?.trim()) {
    recordSearch(options.keyword).catch((error) => {
      console.error('Failed to record search:', error);
    });
  }
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return [];
    }

    const articlesRef = collection(db, 'articles');
    let q = query(articlesRef, where('isPublished', '==', true));

    // カテゴリーで絞り込み
    if (options.categoryId) {
      q = query(q, where('categoryIds', 'array-contains', options.categoryId));
    }

    // タグで絞り込み
    if (options.tagId) {
      q = query(q, where('tagIds', 'array-contains', options.tagId));
    }

    // ソート
    q = query(q, orderBy('publishedAt', 'desc'));

    // リミット
    const limitCount = options.limitCount || 50;
    q = query(q, limit(limitCount));

    const querySnapshot = await getDocs(q);

    const now = new Date();
    let articles = querySnapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        publishedAt: convertTimestamp(data.publishedAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Article;
    })
    // 公開日が現在日時以下の記事のみを表示（予約公開記事を除外）
    .filter(article => article.publishedAt <= now);

    // キーワード検索（クライアントサイドでフィルタリング）
    if (options.keyword) {
      const keyword = options.keyword.toLowerCase();
      articles = articles.filter((article) => {
        const titleMatch = article.title.toLowerCase().includes(keyword);
        const excerptMatch = article.excerpt?.toLowerCase().includes(keyword);
        const contentMatch = article.content.toLowerCase().includes(keyword);
        return titleMatch || excerptMatch || contentMatch;
      });
    }

    return articles;
  } catch (error) {
    console.error('Error searching articles:', error);
    return [];
  }
};


