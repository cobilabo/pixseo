import { createHash } from 'crypto';
import {
  FieldValue,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

export function hashMediaBuffer(buffer: Buffer | Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export type MediaCollectionName = 'mediaLibrary' | 'media';

export interface ExistingMedia {
  id: string;
  url: string;
  thumbnailUrl?: string;
  collection: MediaCollectionName;
}

const COLLECTIONS: MediaCollectionName[] = ['mediaLibrary', 'media'];

function createdAtMillis(data: DocumentData): number {
  const value = data.createdAt;
  if (value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return 0;
}

function toExisting(
  collection: MediaCollectionName,
  doc: QueryDocumentSnapshot
): ExistingMedia | null {
  const data = doc.data();
  if (!data?.url || typeof data.url !== 'string') return null;
  return {
    id: doc.id,
    url: data.url,
    thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined,
    collection,
  };
}

async function queryFirstMatching(
  db: Firestore,
  field: string,
  value: string,
  mediaId: string,
  extra?: (data: DocumentData) => boolean
): Promise<ExistingMedia | null> {
  if (!value) return null;

  for (const collection of COLLECTIONS) {
    const snap = await db.collection(collection).where(field, '==', value).limit(40).get();
    const matches = snap.docs
      .filter((doc) => {
        const data = doc.data();
        if (data.mediaId !== mediaId) return false;
        return extra ? extra(data) : true;
      })
      .sort((a, b) => createdAtMillis(a.data()) - createdAtMillis(b.data()))
      .map((doc) => toExisting(collection, doc))
      .filter((item): item is ExistingMedia => item !== null);

    if (matches.length > 0) {
      return matches[0];
    }
  }

  return null;
}

export async function rememberContentHash(
  db: Firestore,
  collection: MediaCollectionName,
  id: string,
  contentHash: string
): Promise<void> {
  try {
    await db.collection(collection).doc(id).update({
      contentHash,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn('[media-dedup] contentHash の書き戻しに失敗:', id, error);
  }
}

/**
 * 同一テナント内で再利用できるメディアを探す。
 * 1. 移行元 URL（wpOriginalUrl / sourceUrl）
 * 2. 保存バイト列の SHA-256
 * 3. アップロード時のみ: ファイル名 + サイズ (+ 画素数)
 */
export async function findReusableMedia(
  db: Firestore,
  options: {
    mediaId: string;
    contentHash?: string;
    originalName?: string;
    size?: number;
    width?: number;
    height?: number;
    sourceUrl?: string;
    allowOriginalMetaFallback?: boolean;
  }
): Promise<ExistingMedia | null> {
  const { mediaId } = options;
  if (!mediaId) return null;

  if (options.sourceUrl) {
    const byWp = await queryFirstMatching(db, 'wpOriginalUrl', options.sourceUrl, mediaId);
    if (byWp) {
      if (options.contentHash) {
        await rememberContentHash(db, byWp.collection, byWp.id, options.contentHash);
      }
      return byWp;
    }
    const bySource = await queryFirstMatching(db, 'sourceUrl', options.sourceUrl, mediaId);
    if (bySource) {
      if (options.contentHash) {
        await rememberContentHash(db, bySource.collection, bySource.id, options.contentHash);
      }
      return bySource;
    }
  }

  if (options.contentHash) {
    const byHash = await queryFirstMatching(db, 'contentHash', options.contentHash, mediaId);
    if (byHash) return byHash;
  }

  if (
    options.allowOriginalMetaFallback &&
    options.originalName &&
    typeof options.size === 'number'
  ) {
    const byMeta = await queryFirstMatching(
      db,
      'originalName',
      options.originalName,
      mediaId,
      (data) => {
        if (data.size !== options.size) return false;
        if (options.width && data.width && data.width !== options.width) return false;
        if (options.height && data.height && data.height !== options.height) return false;
        return true;
      }
    );
    if (byMeta && options.contentHash) {
      await rememberContentHash(db, byMeta.collection, byMeta.id, options.contentHash);
    }
    return byMeta;
  }

  return null;
}
