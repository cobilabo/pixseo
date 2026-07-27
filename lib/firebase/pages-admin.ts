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
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, initializeFirebase } from './config';
import { Page } from '@/types/page';
import { PageRevision } from '@/types/revision';
import { createRevision, pruneRevisions, listRevisions, getRevisionById } from './revisions-admin';

export { listRevisions as listPageRevisions, getRevisionById as getPageRevisionById } from './revisions-admin';

// クライアント側でFirebaseを初期化
if (typeof window !== 'undefined') {
  initializeFirebase();
}

function removeUndefinedDeep(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefinedDeep);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefinedDeep(v)])
    );
  }
  return obj;
}

/**
 * 固定ページの作成
 */
export const createPage = async (pageData: Omit<Page, 'id' | 'publishedAt' | 'updatedAt'>): Promise<string> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const now = Timestamp.now();
    const cleanData = removeUndefinedDeep(pageData);
    
    const docRef = await addDoc(collection(db, 'pages'), {
      ...cleanData,
      publishedAt: now,
      updatedAt: now,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating page:', error);
    throw error;
  }
};

/**
 * 固定ページの更新
 */
export const updatePage = async (id: string, pageData: Partial<Page>): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const cleanData = removeUndefinedDeep(pageData);
    
    const pageRef = doc(db, 'pages', id);
    await updateDoc(pageRef, {
      ...cleanData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating page:', error);
    throw error;
  }
};

function pageToSnapshot(page: Page): Omit<Page, 'id'> {
  const { id: _id, ...snapshot } = page;
  return snapshot;
}

/**
 * 更新前の状態をリビジョンとして保存してから更新
 */
export const updatePageWithRevision = async (id: string, pageData: Partial<Page>): Promise<void> => {
  const current = await getPageById(id);
  if (!current) {
    throw new Error('Page not found');
  }

  await createRevision('page', id, pageToSnapshot(current));
  await updatePage(id, pageData);
  await pruneRevisions('page', id);
};

/**
 * リビジョンから固定ページを復元（現行をリビジョンに退避してから復元）
 */
export const restorePageRevision = async (pageId: string, revisionId: string): Promise<void> => {
  const revision = await getRevisionById<PageRevision>('page', pageId, revisionId);
  if (!revision) {
    throw new Error('Revision not found');
  }

  const current = await getPageById(pageId);
  if (!current) {
    throw new Error('Page not found');
  }

  await createRevision('page', pageId, pageToSnapshot(current));
  await updatePage(pageId, revision.snapshot);
  await pruneRevisions('page', pageId);
};

/**
 * 固定ページの削除
 */
export const deletePage = async (id: string): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const pageRef = doc(db, 'pages', id);
    await deleteDoc(pageRef);
  } catch (error) {
    console.error('Error deleting page:', error);
    throw error;
  }
};

/**
 * 固定ページの取得（ID指定）
 */
export const getPageById = async (id: string): Promise<Page | null> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const pageRef = doc(db, 'pages', id);
    const pageSnap = await getDoc(pageRef);

    if (!pageSnap.exists()) {
      return null;
    }

    const data = pageSnap.data();
    
    return {
      id: pageSnap.id,
      ...data,
      publishedAt: data.publishedAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as Page;
  } catch (error) {
    console.error('Error getting page:', error);
    throw error;
  }
};

/**
 * 固定ページ一覧の取得
 */
export const getPages = async (mediaId?: string): Promise<Page[]> => {
  if (!db) {
    console.error('[getPages] Firestore is not initialized');
    return []; // エラー時は空配列を返す
  }

  try {
    const pagesRef = collection(db, 'pages');
    let q;
    
    // mediaIdでフィルタリング（指定がある場合）
    // orderByはクライアント側で実行（複合インデックス不要）
    if (mediaId) {
      q = query(pagesRef, where('mediaId', '==', mediaId));
    } else {
      q = pagesRef;
    }
    
    const querySnapshot = await getDocs(q);
    
    const pages = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as Page;
    });
    
    // クライアント側でソート（複合インデックス不要）
    return pages.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('[getPages] Error:', error instanceof Error ? error.message : String(error));
    return [];
  }
};

