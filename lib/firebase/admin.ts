import * as admin from 'firebase-admin';
import { buildWpMediaReplacementMapFromDocs } from '@/lib/article-utils';

// Firebase Admin SDKの初期化（サーバーサイド用）
if (!admin.apps.length) {
  // Vercel環境: サービスアカウントキーを環境変数から読み込む
  // ローカル環境: ADC（Application Default Credentials）を使用
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    : admin.credential.applicationDefault();

  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    'pixseo-1eeef';
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

  admin.initializeApp({
    credential,
    projectId,
    storageBucket,
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();

let wpMediaUrlMapCache: Map<string, string> | null = null;
let wpMediaUrlMapLoadedAt = 0;
const WP_MEDIA_URL_MAP_TTL_MS = 10 * 60 * 1000;
/** マップキー生成ロジック変更時に上げる（デプロイ直後に古い空/不十分なキャッシュを捨てる） */
const WP_MEDIA_URL_MAP_VERSION = 2;
let wpMediaUrlMapCachedVersion = -1;

/** mediaLibrary の wpOriginalUrl -> url（メモリキャッシュ付き） */
export async function getWpMediaUrlMap(): Promise<Map<string, string>> {
  if (wpMediaUrlMapCachedVersion !== WP_MEDIA_URL_MAP_VERSION) {
    wpMediaUrlMapCache = null;
    wpMediaUrlMapCachedVersion = WP_MEDIA_URL_MAP_VERSION;
  }
  const now = Date.now();
  if (wpMediaUrlMapCache && now - wpMediaUrlMapLoadedAt < WP_MEDIA_URL_MAP_TTL_MS) {
    return wpMediaUrlMapCache;
  }
  const snap = await adminDb.collection('mediaLibrary').get();
  wpMediaUrlMapCache = buildWpMediaReplacementMapFromDocs(snap.docs);
  wpMediaUrlMapLoadedAt = now;
  return wpMediaUrlMapCache;
}

export function invalidateWpMediaUrlMapCache(): void {
  wpMediaUrlMapCache = null;
  wpMediaUrlMapLoadedAt = 0;
}

