import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { adminDb } from './admin';
import { Article, Category, Tag } from '@/types/article';
import { Writer } from '@/types/writer';
import { cacheManager, generateCacheKey, CACHE_TTL } from '@/lib/cache-manager';

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
    // キャッシュキー生成
    const cacheKey = generateCacheKey('article', slug, mediaId);
    
    // キャッシュから取得
    const cached = cacheManager.get<Article>(cacheKey, CACHE_TTL.MEDIUM);
    if (cached) {
      return cached;
    }
    
    // Firestoreから取得
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
    
    // tableOfContentsを安全に処理
    let tableOfContents = data.tableOfContents || [];
    if (!Array.isArray(tableOfContents)) {
      console.warn('[getArticleServer] tableOfContents is not an array:', tableOfContents);
      tableOfContents = [];
    }
    
    // relatedArticleIdsを安全に処理
    let relatedArticleIds = data.relatedArticleIds || [];
    if (!Array.isArray(relatedArticleIds)) {
      console.warn('[getArticleServer] relatedArticleIds is not an array:', relatedArticleIds);
      relatedArticleIds = [];
    }
    
    const article = {
      id: doc.id,
      ...data,
      publishedAt: convertTimestamp(data.publishedAt),
      updatedAt: convertTimestamp(data.updatedAt),
      tableOfContents,
      relatedArticleIds,
      readingTime: typeof data.readingTime === 'number' ? data.readingTime : undefined,
    } as Article;
    
    // キャッシュに保存
    cacheManager.set(cacheKey, article);
    
    return article;
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
    // キャッシュキー生成
    const cacheKey = generateCacheKey(
      'articles',
      options.mediaId,
      options.categoryId,
      options.tagId,
      options.orderBy,
      options.orderDirection,
      options.limit
    );
    
    // キャッシュから取得
    const cached = cacheManager.get<Article[]>(cacheKey, CACHE_TTL.MEDIUM);
    if (cached) {
      return cached;
    }
    
    // Firestoreから取得
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
      
      // tableOfContentsを安全に処理
      let tableOfContents = data.tableOfContents || [];
      if (!Array.isArray(tableOfContents)) {
        tableOfContents = [];
      }
      
      // relatedArticleIdsを安全に処理
      let relatedArticleIds = data.relatedArticleIds || [];
      if (!Array.isArray(relatedArticleIds)) {
        relatedArticleIds = [];
      }
      
      return {
        id: doc.id,
        ...data,
        publishedAt: convertTimestamp(data.publishedAt),
        updatedAt: convertTimestamp(data.updatedAt),
        tableOfContents,
        relatedArticleIds,
        readingTime: typeof data.readingTime === 'number' ? data.readingTime : undefined,
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
    
    // キャッシュに保存
    cacheManager.set(cacheKey, articles);
    
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
// 1. relatedArticleIds が指定されていればそれを優先
// 2. なければカテゴリー・タグの一致度で自動選択
export const getRelatedArticlesServer = async (
  currentArticle: Article,
  limitCount: number = 6,
  mediaId?: string
): Promise<Article[]> => {
  try {
    const { id: excludeArticleId, relatedArticleIds, categoryIds, tagIds } = currentArticle;
    
    // キャッシュキー生成
    const cacheKey = generateCacheKey(
      'related',
      excludeArticleId,
      relatedArticleIds?.join(',') || '',
      categoryIds.join(','),
      tagIds.join(','),
      limitCount,
      mediaId
    );
    
    // キャッシュから取得
    const cached = cacheManager.get<Article[]>(cacheKey, CACHE_TTL.MEDIUM);
    if (cached) {
      return cached;
    }
    
    let articles: Article[] = [];
    
    // 1. relatedArticleIds が指定されていればそれを使用
    if (relatedArticleIds && relatedArticleIds.length > 0) {
      const articlesRef = adminDb.collection('articles');
      
      // 各IDごとに取得
      const docs = await Promise.all(
        relatedArticleIds.slice(0, limitCount).map(id => articlesRef.doc(id).get())
      );
      
      articles = docs
        .filter(doc => doc.exists && doc.data()?.isPublished)
        .map(doc => {
          const data = doc.data()!;
          
          // tableOfContentsを安全に処理
          let tableOfContents = data.tableOfContents || [];
          if (!Array.isArray(tableOfContents)) {
            tableOfContents = [];
          }
          
          // relatedArticleIdsを安全に処理
          let relatedArticleIds = data.relatedArticleIds || [];
          if (!Array.isArray(relatedArticleIds)) {
            relatedArticleIds = [];
          }
          
          return {
            id: doc.id,
            ...data,
            publishedAt: convertTimestamp(data.publishedAt),
            updatedAt: convertTimestamp(data.updatedAt),
            tableOfContents,
            relatedArticleIds,
            readingTime: typeof data.readingTime === 'number' ? data.readingTime : undefined,
          } as Article;
        })
        .filter(article => article.mediaId === (mediaId || article.mediaId));
    }
    
    // 2. 足りない場合は自動で補完
    if (articles.length < limitCount) {
      const articlesRef = adminDb.collection('articles');
      let q = articlesRef.where('isPublished', '==', true);
      
      // mediaIdが指定されている場合はフィルタリング
      if (mediaId) {
        q = q.where('mediaId', '==', mediaId) as any;
      }
      
      const snapshot = await q.get();
      
      // すでに選択されているIDを除外
      const excludeIds = [excludeArticleId, ...articles.map(a => a.id)];
      
      let autoArticles = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          
          // tableOfContentsを安全に処理
          let tableOfContents = data.tableOfContents || [];
          if (!Array.isArray(tableOfContents)) {
            tableOfContents = [];
          }
          
          // relatedArticleIdsを安全に処理
          let relatedArticleIds = data.relatedArticleIds || [];
          if (!Array.isArray(relatedArticleIds)) {
            relatedArticleIds = [];
          }
          
          return {
            id: doc.id,
            ...data,
            publishedAt: convertTimestamp(data.publishedAt),
            updatedAt: convertTimestamp(data.updatedAt),
            tableOfContents,
            relatedArticleIds,
            readingTime: typeof data.readingTime === 'number' ? data.readingTime : undefined,
          } as Article;
        })
        .filter((article) => !excludeIds.includes(article.id))
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .slice(0, (limitCount - articles.length) * 2);
      
      // 関連度でソート
      autoArticles = autoArticles
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
        .slice(0, limitCount - articles.length)
        .map(({ relevanceScore, ...article }) => article);
      
      articles = [...articles, ...autoArticles];
    }
    
    // キャッシュに保存
    cacheManager.set(cacheKey, articles);
    
    return articles;
  } catch (error) {
    console.error('Error getting related articles:', error);
    return [];
  }
};

// カテゴリーを取得（サーバーサイド用）
export const getCategoryServer = async (categoryId: string): Promise<Category | null> => {
  try {
    // キャッシュキー生成
    const cacheKey = generateCacheKey('category', categoryId);
    
    // キャッシュから取得
    const cached = cacheManager.get<Category>(cacheKey, CACHE_TTL.LONG);
    if (cached) {
      return cached;
    }
    
    // Firestoreから取得
    const categoryDoc = await adminDb.collection('categories').doc(categoryId).get();
    
    if (!categoryDoc.exists) {
      return null;
    }
    
    const data = categoryDoc.data();
    const category: Category = {
      id: categoryDoc.id,
      name: data?.name || '',
      slug: data?.slug || '',
      description: data?.description,
      mediaId: data?.mediaId || '',
      isRecommended: data?.isRecommended || false,
    };
    
    // キャッシュに保存
    cacheManager.set(cacheKey, category);
    
    return category;
  } catch (error) {
    console.error('[getCategoryServer] Error:', error);
    return null;
  }
};

// 複数のカテゴリーを取得（サーバーサイド用）
export const getCategoriesServer = async (categoryIds: string[]): Promise<Category[]> => {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }

  try {
    const categories = await Promise.all(
      categoryIds.map((id) => getCategoryServer(id))
    );
    return categories.filter((cat): cat is Category => cat !== null);
  } catch (error) {
    console.error('[getCategoriesServer] Error:', error);
    return [];
  }
};

// タグを取得（サーバーサイド用）
export const getTagServer = async (tagId: string): Promise<Tag | null> => {
  try {
    // キャッシュキー生成
    const cacheKey = generateCacheKey('tag', tagId);
    
    // キャッシュから取得
    const cached = cacheManager.get<Tag>(cacheKey, CACHE_TTL.LONG);
    if (cached) {
      return cached;
    }
    
    // Firestoreから取得
    const tagDoc = await adminDb.collection('tags').doc(tagId).get();
    
    if (!tagDoc.exists) {
      return null;
    }
    
    const data = tagDoc.data();
    const tag: Tag = {
      id: tagDoc.id,
      name: data?.name || '',
      slug: data?.slug || '',
      mediaId: data?.mediaId || '',
    };
    
    // キャッシュに保存
    cacheManager.set(cacheKey, tag);
    
    return tag;
  } catch (error) {
    console.error('[getTagServer] Error:', error);
    return null;
  }
};

// 複数のタグを取得（サーバーサイド用）
export const getTagsServer = async (tagIds: string[]): Promise<Tag[]> => {
  if (!tagIds || tagIds.length === 0) {
    return [];
  }

  try {
    const tags = await Promise.all(
      tagIds.map((id) => getTagServer(id))
    );
    return tags.filter((tag): tag is Tag => tag !== null);
  } catch (error) {
    console.error('[getTagsServer] Error:', error);
    return [];
  }
};

// ライターを取得（サーバーサイド用）
export const getWriterServer = async (writerId: string): Promise<Writer | null> => {
  try {
    // キャッシュキー生成
    const cacheKey = generateCacheKey('writer', writerId);
    
    // キャッシュから取得
    const cached = cacheManager.get<Writer>(cacheKey, CACHE_TTL.LONG);
    if (cached) {
      return cached;
    }
    
    // Firestoreから取得
    const writerDoc = await adminDb.collection('writers').doc(writerId).get();
    
    if (!writerDoc.exists) {
      return null;
    }
    
    const data = writerDoc.data();
    const writer: Writer = {
      id: writerDoc.id,
      handleName: data?.handleName || '',
      icon: data?.icon,
      bio: data?.bio,
      mediaId: data?.mediaId || '',
    };
    
    // キャッシュに保存
    cacheManager.set(cacheKey, writer);
    
    return writer;
  } catch (error) {
    console.error('[getWriterServer] Error:', error);
    return null;
  }
};

// 前後の記事を取得（サーバーサイド用）
export const getAdjacentArticlesServer = async (
  currentArticle: Article,
  mediaId?: string
): Promise<{ previousArticle: Article | null; nextArticle: Article | null }> => {
  try {
    console.log('[getAdjacentArticlesServer] Starting...');
    console.log('[getAdjacentArticlesServer] Current article:', currentArticle.id, currentArticle.title);
    console.log('[getAdjacentArticlesServer] Current publishedAt:', currentArticle.publishedAt);
    console.log('[getAdjacentArticlesServer] Current publishedAt type:', typeof currentArticle.publishedAt, currentArticle.publishedAt instanceof Date);
    console.log('[getAdjacentArticlesServer] mediaId:', mediaId);
    
    // Date を Firestore Timestamp に変換
    const currentPublishedAt = currentArticle.publishedAt instanceof Date 
      ? admin.firestore.Timestamp.fromDate(currentArticle.publishedAt)
      : currentArticle.publishedAt;
    
    console.log('[getAdjacentArticlesServer] Converted publishedAt:', currentPublishedAt);
    
    const articlesRef = adminDb.collection('articles');
    
    // 前の記事を取得
    console.log('[getAdjacentArticlesServer] Querying for previous article...');
    const prevQueryBuilder = articlesRef
      .where('isPublished', '==', true)
      .where('publishedAt', '<', currentPublishedAt)
      .orderBy('publishedAt', 'desc')
      .limit(1);
    
    if (mediaId) {
      // mediaIdフィルタを追加する場合は、別のクエリを作成
      const prevQuery = await articlesRef
        .where('isPublished', '==', true)
        .where('mediaId', '==', mediaId)
        .where('publishedAt', '<', currentPublishedAt)
        .orderBy('publishedAt', 'desc')
        .limit(1)
        .get();
      console.log('[getAdjacentArticlesServer] Previous query result count:', prevQuery.size);
      
      // 次の記事を取得
      console.log('[getAdjacentArticlesServer] Querying for next article...');
      const nextQuery = await articlesRef
        .where('isPublished', '==', true)
        .where('mediaId', '==', mediaId)
        .where('publishedAt', '>', currentPublishedAt)
        .orderBy('publishedAt', 'asc')
        .limit(1)
        .get();
      console.log('[getAdjacentArticlesServer] Next query result count:', nextQuery.size);
      
      return await buildAdjacentArticlesResult(prevQuery, nextQuery);
    } else {
      const prevQuery = await prevQueryBuilder.get();
      console.log('[getAdjacentArticlesServer] Previous query result count:', prevQuery.size);
      
      // 次の記事を取得
      console.log('[getAdjacentArticlesServer] Querying for next article...');
      const nextQuery = await articlesRef
        .where('isPublished', '==', true)
        .where('publishedAt', '>', currentPublishedAt)
        .orderBy('publishedAt', 'asc')
        .limit(1)
        .get();
      console.log('[getAdjacentArticlesServer] Next query result count:', nextQuery.size);
      
      return await buildAdjacentArticlesResult(prevQuery, nextQuery);
    }
  } catch (error) {
    console.error('[getAdjacentArticlesServer] ❌ ERROR OCCURRED ❌');
    console.error('[getAdjacentArticlesServer] Error:', error);
    console.error('[getAdjacentArticlesServer] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[getAdjacentArticlesServer] Error stack:', error instanceof Error ? error.stack : '');
    
    // Firestore インデックスエラーかチェック
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('index') || errorMessage.includes('Index')) {
      console.error('[getAdjacentArticlesServer] 🔥 FIRESTORE INDEX ERROR DETECTED 🔥');
      console.error('[getAdjacentArticlesServer] Firestore の複合インデックスが必要です。');
      console.error('[getAdjacentArticlesServer] Firebase Console でインデックスを作成してください。');
    }
    
    return { previousArticle: null, nextArticle: null };
  }
};

// 前後の記事の結果を構築するヘルパー関数
async function buildAdjacentArticlesResult(
  prevQuery: FirebaseFirestore.QuerySnapshot,
  nextQuery: FirebaseFirestore.QuerySnapshot
): Promise<{ previousArticle: Article | null; nextArticle: Article | null }> {
  let previousArticle: Article | null = null;
  let nextArticle: Article | null = null;
  
  if (!prevQuery.empty) {
    const doc = prevQuery.docs[0];
    const data = doc.data();
    previousArticle = {
      id: doc.id,
      ...data,
      publishedAt: convertTimestamp(data.publishedAt),
      updatedAt: convertTimestamp(data.updatedAt),
      tableOfContents: Array.isArray(data.tableOfContents) ? data.tableOfContents : [],
      relatedArticleIds: Array.isArray(data.relatedArticleIds) ? data.relatedArticleIds : [],
      readingTime: typeof data.readingTime === 'number' ? data.readingTime : undefined,
    } as Article;
    console.log('[getAdjacentArticlesServer] Previous article found:', previousArticle.id, previousArticle.title);
  }
  
  if (!nextQuery.empty) {
    const doc = nextQuery.docs[0];
    const data = doc.data();
    nextArticle = {
      id: doc.id,
      ...data,
      publishedAt: convertTimestamp(data.publishedAt),
      updatedAt: convertTimestamp(data.updatedAt),
      tableOfContents: Array.isArray(data.tableOfContents) ? data.tableOfContents : [],
      relatedArticleIds: Array.isArray(data.relatedArticleIds) ? data.relatedArticleIds : [],
      readingTime: typeof data.readingTime === 'number' ? data.readingTime : undefined,
    } as Article;
    console.log('[getAdjacentArticlesServer] Next article found:', nextArticle.id, nextArticle.title);
  }
  
  console.log('[getAdjacentArticlesServer] Returning:', {
    previousArticle: previousArticle ? previousArticle.id : null,
    nextArticle: nextArticle ? nextArticle.id : null,
  });
  
  return { previousArticle, nextArticle };
}


