import { adminDb, getWpMediaUrlMap } from './admin';
import { Page } from '@/types/page';
import { pageMayContainWpUploads, rewritePageWpMediaUrls } from '@/lib/article-utils';

/**
 * 固定ページの取得（スラッグ指定・サーバーサイド）
 */
export async function getPageServer(slug: string, mediaId?: string): Promise<Page | null> {
  try {
    let query = adminDb.collection('pages').where('slug', '==', slug);
    
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await query.limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    const page = {
      id: doc.id,
      ...data,
      publishedAt: data.publishedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Page;

    if (pageMayContainWpUploads(page)) {
      const map = await getWpMediaUrlMap();
      if (map.size > 0) rewritePageWpMediaUrls(page, map);
    }

    return page;
  } catch (error) {
    console.error('[getPageServer] Error:', error);
    return null;
  }
}

/**
 * 固定ページ一覧の取得（サーバーサイド）
 */
export async function getPagesServer(mediaId?: string): Promise<Page[]> {
  try {
    let query = adminDb.collection('pages').orderBy('order', 'asc');
    
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await query.get();
    
    const pages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Page;
    });

    if (pages.some(pageMayContainWpUploads)) {
      const map = await getWpMediaUrlMap();
      if (map.size > 0) {
        for (const p of pages) rewritePageWpMediaUrls(p, map);
      }
    }

    return pages;
  } catch (error) {
    console.error('[getPagesServer] Error:', error);
    return [];
  }
}

/**
 * 公開済み固定ページ一覧の取得（サーバーサイド）
 */
export async function getPublishedPagesServer(mediaId?: string): Promise<Page[]> {
  try {
    let query = adminDb
      .collection('pages')
      .where('isPublished', '==', true)
      .orderBy('order', 'asc');
    
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await query.get();
    
    const pages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Page;
    });

    if (pages.some(pageMayContainWpUploads)) {
      const map = await getWpMediaUrlMap();
      if (map.size > 0) {
        for (const p of pages) rewritePageWpMediaUrls(p, map);
      }
    }

    return pages;
  } catch (error) {
    console.error('[getPublishedPagesServer] Error:', error);
    return [];
  }
}

