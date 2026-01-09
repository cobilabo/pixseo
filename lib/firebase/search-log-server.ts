import { adminDb } from './admin';
import { DailySearchLogItem } from '@/types/search';

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
 * 人気のタグを集計（直近N日間）- サーバーサイド用
 * @param mediaId - メディアテナントID
 * @param days - 集計する日数（デフォルト: 30日）
 * @param limitCount - 取得件数（デフォルト: 10）
 */
export const getPopularSearchTagsServer = async (
  mediaId: string,
  days: number = 30,
  limitCount: number = 10
): Promise<DailySearchLogItem[]> => {
  if (!adminDb) {
    console.error('Admin Firestore is not initialized');
    return [];
  }

  const endDate = getTodayDateString();
  const startDate = getDateStringDaysAgo(days);

  try {
    // dailySearchLogsコレクションから指定期間のログを取得
    const logsRef = adminDb.collection('dailySearchLogs');
    const snapshot = await logsRef
      .where('mediaId', '==', mediaId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    // 全タグを集計
    const tagMap = new Map<string, DailySearchLogItem>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const tags = data.tags || [];
      
      for (const item of tags) {
        const existing = tagMap.get(item.value);
        if (existing) {
          existing.count += item.count;
        } else {
          tagMap.set(item.value, { ...item });
        }
      }
    }

    // カウントでソートして上位を返す
    return Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting popular search tags (server):', error);
    return [];
  }
};
