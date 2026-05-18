import { adminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  AggregatedPopularKeyword,
  DailySearchLogItem,
  PopularKeywordApproval,
  PopularKeywordDecidedStatus,
  PopularKeywordStatus,
} from '@/types/search';

const COLLECTION = 'popularKeywordApprovals';

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * N日前の日付をYYYY-MM-DD形式で取得
 */
function getDateStringDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * キーワード値からFirestore docId 用の base64url 文字列を生成
 * （Firestore のdocIdに使えない文字 / 長さ制限の回避目的）
 */
function encodeKeyword(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 承認レコードのドキュメントIDを生成
 */
export function buildApprovalDocId(mediaId: string, value: string): string {
  const normalized = value.trim().toLowerCase();
  return `${mediaId}__${encodeKeyword(normalized)}`;
}

/**
 * dailySearchLogs から指定期間のキーワードを集計する
 * @param mediaId メディアテナントID
 * @param days 集計日数（0 で全期間）
 */
export async function aggregateKeywordsFromDailyLogs(
  mediaId: string,
  days: number
): Promise<DailySearchLogItem[]> {
  if (!adminDb) {
    console.error('Admin Firestore is not initialized');
    return [];
  }

  try {
    const endDate = days > 0 ? getTodayDateString() : null;
    const startDate = days > 0 ? getDateStringDaysAgo(days) : null;

    const snapshot = await adminDb
      .collection('dailySearchLogs')
      .where('mediaId', '==', mediaId)
      .get();

    const keywordMap = new Map<string, DailySearchLogItem>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docDate =
        typeof data.date === 'string'
          ? data.date
          : doc.id.startsWith(`${mediaId}_`)
            ? doc.id.slice(mediaId.length + 1)
            : '';
      if (startDate && endDate) {
        if (!docDate || docDate < startDate || docDate > endDate) {
          continue;
        }
      }
      const keywords: DailySearchLogItem[] = data.keywords || [];

      for (const item of keywords) {
        if (!item?.value) continue;
        const normalized = item.value.trim().toLowerCase();
        if (!normalized) continue;
        const existing = keywordMap.get(normalized);
        if (existing) {
          existing.count += item.count || 0;
        } else {
          keywordMap.set(normalized, {
            value: normalized,
            displayName: item.displayName || item.value,
            count: item.count || 0,
          });
        }
      }
    }

    return Array.from(keywordMap.values()).sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[popular-keywords] aggregateKeywordsFromDailyLogs error:', error);
    return [];
  }
}

/**
 * 指定したキーワードの承認状態を一括取得
 */
export async function getPopularKeywordApprovalsMap(
  mediaId: string,
  values: string[]
): Promise<Map<string, PopularKeywordDecidedStatus>> {
  const map = new Map<string, PopularKeywordDecidedStatus>();
  if (!adminDb || values.length === 0) return map;

  try {
    const colRef = adminDb.collection(COLLECTION);
    const docIds = values.map((v) => buildApprovalDocId(mediaId, v));

    // Firestore の getAll は最大ドキュメント数の上限あり（メモリベース）。
    // 数百〜数千程度なら問題なし。
    const refs = docIds.map((id) => colRef.doc(id));

    // バッチサイズ 300 で分割
    const BATCH = 300;
    for (let i = 0; i < refs.length; i += BATCH) {
      const chunk = refs.slice(i, i + BATCH);
      const docs = await adminDb.getAll(...chunk);
      for (const d of docs) {
        if (!d.exists) continue;
        const data = d.data();
        if (data?.status === 'approved' || data?.status === 'rejected') {
          map.set(data.value, data.status);
        }
      }
    }
  } catch (error) {
    console.error('[popular-keywords] getPopularKeywordApprovalsMap error:', error);
  }
  return map;
}

/**
 * 承認済みの全キーワードを取得（サイト側で承認フィルタする用途）
 */
async function getAllApprovedKeywords(mediaId: string): Promise<Set<string>> {
  const set = new Set<string>();
  if (!adminDb) return set;
  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('mediaId', '==', mediaId)
      .where('status', '==', 'approved')
      .get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data?.value) set.add(data.value);
    }
  } catch (error) {
    console.error('[popular-keywords] getAllApprovedKeywords error:', error);
  }
  return set;
}

interface GetAggregatedPopularKeywordsOptions {
  days: number;                    // 集計日数（0 で全期間）
  status?: PopularKeywordStatus | 'all';
  limit?: number;
}

/**
 * 集計+承認状態を結合して返す（管理画面用）
 */
export async function getAggregatedPopularKeywords(
  mediaId: string,
  options: GetAggregatedPopularKeywordsOptions
): Promise<{
  items: AggregatedPopularKeyword[];
  counts: { pending: number; approved: number; rejected: number; total: number };
}> {
  const { days, status = 'all', limit } = options;

  const aggregated = await aggregateKeywordsFromDailyLogs(mediaId, days);
  const approvalsMap = await getPopularKeywordApprovalsMap(
    mediaId,
    aggregated.map((a) => a.value)
  );

  const items: AggregatedPopularKeyword[] = aggregated.map((a) => ({
    value: a.value,
    displayName: a.displayName || a.value,
    count: a.count,
    status: approvalsMap.get(a.value) ?? 'pending',
  }));

  const counts = {
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    total: items.length,
  };

  let filtered = items;
  if (status !== 'all') {
    filtered = items.filter((i) => i.status === status);
  }

  if (typeof limit === 'number' && limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return { items: filtered, counts };
}

/**
 * 承認済みキーワードを件数順で取得（サイト側 SSR 用）
 */
export async function getApprovedPopularKeywordsServer(
  mediaId: string,
  days: number = 30,
  limitCount: number = 10
): Promise<DailySearchLogItem[]> {
  const aggregated = await aggregateKeywordsFromDailyLogs(mediaId, days);
  if (aggregated.length === 0) return [];

  const approved = await getAllApprovedKeywords(mediaId);
  if (approved.size === 0) return [];

  return aggregated
    .filter((a) => approved.has(a.value))
    .slice(0, limitCount);
}

/**
 * 承認状態をupsert（'approved' | 'rejected'）
 */
export async function setPopularKeywordApproval(
  mediaId: string,
  value: string,
  displayName: string,
  status: PopularKeywordDecidedStatus,
  decidedBy: string
): Promise<void> {
  if (!adminDb) throw new Error('Admin Firestore is not initialized');
  const normalized = value.trim().toLowerCase();
  if (!normalized) throw new Error('value is empty');

  const docId = buildApprovalDocId(mediaId, normalized);
  const ref = adminDb.collection(COLLECTION).doc(docId);
  const now = FieldValue.serverTimestamp();

  await ref.set(
    {
      mediaId,
      value: normalized,
      displayName: displayName || value,
      status,
      decidedBy,
      decidedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
}

/**
 * 承認レコードを削除して「未承認(pending)」に戻す
 */
export async function removePopularKeywordApproval(
  mediaId: string,
  value: string
): Promise<void> {
  if (!adminDb) throw new Error('Admin Firestore is not initialized');
  const normalized = value.trim().toLowerCase();
  if (!normalized) throw new Error('value is empty');
  const docId = buildApprovalDocId(mediaId, normalized);
  await adminDb.collection(COLLECTION).doc(docId).delete().catch(() => {
    // ドキュメントが存在しなくても無視
  });
}

export type { PopularKeywordApproval };
