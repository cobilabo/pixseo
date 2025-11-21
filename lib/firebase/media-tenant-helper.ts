/**
 * MediaTenant関連のヘルパー関数（キャッシュ付き）
 * generateMetadata と ArticlePage で共通利用
 */

import { headers } from 'next/headers';
import { adminDb } from './admin';
import { cacheManager } from '../cache-manager';

/**
 * ホスト名からmediaIdを取得（キャッシュ付き）
 * 
 * サポートする環境:
 * 1. プレビュー: {slug}.pixseo-preview.cloud
 * 2. カスタムドメイン: 任意のドメイン
 * 
 * @returns mediaId | null
 */
export async function getMediaIdFromHost(): Promise<string | null> {
  try {
    const headersList = headers();
    const mediaIdFromHeader = headersList.get('x-media-id');
    const host = headersList.get('host') || '';

    // ヘッダーから直接取得できた場合
    if (mediaIdFromHeader) {
      return mediaIdFromHeader;
    }

    // 管理画面は除外
    if (host.startsWith('admin.')) {
      return null;
    }

    // 1. プレビュー環境: {slug}.pixseo-preview.cloud
    if (host.endsWith('.pixseo-preview.cloud')) {
      const slug = host.replace('.pixseo-preview.cloud', '');
      
      // キャッシュキー
      const cacheKey = `mediaId:slug:${slug}`;

      // キャッシュから取得（5分間有効）
      const cachedMediaId = cacheManager.get<string>(cacheKey, 5 * 60 * 1000);
      if (cachedMediaId) {
        return cachedMediaId;
      }

      // Firestoreから取得
      const tenantsSnapshot = await adminDb
        .collection('mediaTenants')
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (tenantsSnapshot.empty) {
        return null;
      }

      const mediaId = tenantsSnapshot.docs[0].id;

      // キャッシュに保存
      cacheManager.set(cacheKey, mediaId);

      return mediaId;
    }

    // 2. カスタムドメイン
    const cacheKey = `mediaId:domain:${host}`;

    // キャッシュから取得（5分間有効）
    const cachedMediaId = cacheManager.get<string>(cacheKey, 5 * 60 * 1000);
    if (cachedMediaId) {
      return cachedMediaId;
    }

    // Firestoreから取得
    const tenantsSnapshot = await adminDb
      .collection('mediaTenants')
      .where('customDomain', '==', host)
      .limit(1)
      .get();

    if (tenantsSnapshot.empty) {
      return null;
    }

    const mediaId = tenantsSnapshot.docs[0].id;

    // キャッシュに保存
    cacheManager.set(cacheKey, mediaId);

    return mediaId;
  } catch (error) {
    console.error('[getMediaIdFromHost] Error:', error);
    return null;
  }
}

export interface SiteInfo {
  allowIndexing: boolean;
  // 後方互換性のため既存フィールドを保持
  name: string;
  description?: string;
  faviconUrl?: string;
  logoUrl?: string;
  symbolUrl?: string;
  ogImageUrl?: string;
  // 多言語フィールド
  name_ja?: string;
  name_en?: string;
  name_zh?: string;
  name_ko?: string;
  description_ja?: string;
  description_en?: string;
  description_zh?: string;
  description_ko?: string;
}

/**
 * mediaIdからサイト情報を取得（キャッシュ付き）
 * @param mediaId 
 * @returns SiteInfo
 */
export async function getSiteInfo(mediaId: string): Promise<SiteInfo> {
  const defaultInfo: SiteInfo = {
    allowIndexing: false,
    name: 'ふらっと。',
  };

  if (!mediaId) {
    return defaultInfo;
  }

  try {
    // キャッシュキー
    const cacheKey = `siteInfo:${mediaId}`;

    // キャッシュから取得（5分間有効）
    const cachedInfo = cacheManager.get<SiteInfo>(
      cacheKey,
      5 * 60 * 1000
    );
    if (cachedInfo) {
      return cachedInfo;
    }

    // Firestoreから取得
    const tenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
    
    if (!tenantDoc.exists) {
      return defaultInfo;
    }

    const data = tenantDoc.data();
    const siteInfo: SiteInfo = {
      allowIndexing: data?.allowIndexing || false,
      name: data?.name || defaultInfo.name,
      description: data?.siteDescription || undefined,
      faviconUrl: data?.logoPortrait || undefined,
      logoUrl: data?.logoLandscape || undefined,
      symbolUrl: data?.logoSquare || undefined,
      ogImageUrl: data?.ogImage || undefined,
      // 多言語フィールド
      name_ja: data?.name_ja || data?.name,
      name_en: data?.name_en || data?.name,
      name_zh: data?.name_zh || data?.name,
      name_ko: data?.name_ko || data?.name,
      description_ja: data?.siteDescription_ja || data?.siteDescription,
      description_en: data?.siteDescription_en || data?.siteDescription,
      description_zh: data?.siteDescription_zh || data?.siteDescription,
      description_ko: data?.siteDescription_ko || data?.siteDescription,
    };

    // キャッシュに保存
    cacheManager.set(cacheKey, siteInfo);

    return siteInfo;
  } catch (error) {
    console.error('[getSiteInfo] Error:', error);
    return defaultInfo;
  }
}

