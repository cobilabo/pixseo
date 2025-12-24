import { 
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs
} from 'firebase/firestore';
import { db } from './config';
import { DailySearchLog, DailySearchLogItem, SearchLogType } from '@/types/search';

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
 * 検索ログを記録（日ベース管理）
 * @param type - 検索の種類（'keyword' | 'tag'）
 * @param value - キーワードまたはタグID
 * @param mediaId - メディアテナントID
 * @param displayName - タグの場合は表示名（オプション）
 */
export const recordDailySearchLog = async (
  type: SearchLogType,
  value: string,
  mediaId: string,
  displayName?: string
): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  if (!value || !value.trim() || !mediaId) {
    return;
  }

  const normalizedValue = value.trim().toLowerCase();
  const today = getTodayDateString();
  const docId = `${mediaId}_${today}`;

  try {
    const logRef = doc(db, 'dailySearchLogs', docId);
    const logDoc = await getDoc(logRef);

    if (logDoc.exists()) {
      // 既存のドキュメントを更新
      const data = logDoc.data() as DailySearchLog;
      const fieldName = type === 'keyword' ? 'keywords' : 'tags';
      const items: DailySearchLogItem[] = data[fieldName] || [];
      
      // 既存のアイテムを探す
      const existingIndex = items.findIndex(
        item => item.value.toLowerCase() === normalizedValue
      );

      if (existingIndex >= 0) {
        // カウントアップ
        items[existingIndex].count += 1;
      } else {
        // 新規追加
        items.push({
          value: normalizedValue,
          displayName: displayName || value,
          count: 1,
        });
      }

      await setDoc(logRef, {
        ...data,
        [fieldName]: items,
        updatedAt: new Date(),
      }, { merge: true });
    } else {
      // 新規ドキュメント作成
      const newItem: DailySearchLogItem = {
        value: normalizedValue,
        displayName: displayName || value,
        count: 1,
      };

      const newLog: Omit<DailySearchLog, 'id'> = {
        date: today,
        mediaId,
        keywords: type === 'keyword' ? [newItem] : [],
        tags: type === 'tag' ? [newItem] : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(logRef, newLog);
    }
  } catch (error) {
    console.error('Error recording daily search log:', error);
    // エラーが発生しても検索自体は継続
  }
};

/**
 * 指定された日付範囲の検索ログを取得
 * @param mediaId - メディアテナントID
 * @param startDate - 開始日（YYYY-MM-DD形式）
 * @param endDate - 終了日（YYYY-MM-DD形式）
 */
export const getDailySearchLogs = async (
  mediaId: string,
  startDate: string,
  endDate: string
): Promise<DailySearchLog[]> => {
  if (!db) {
    console.error('Firestore is not initialized');
    return [];
  }

  try {
    const logsRef = collection(db, 'dailySearchLogs');
    const q = query(
      logsRef,
      where('mediaId', '==', mediaId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as DailySearchLog[];
  } catch (error) {
    console.error('Error getting daily search logs:', error);
    return [];
  }
};

/**
 * 今日の検索ログを取得
 * @param mediaId - メディアテナントID
 */
export const getTodaySearchLog = async (
  mediaId: string
): Promise<DailySearchLog | null> => {
  if (!db) {
    console.error('Firestore is not initialized');
    return null;
  }

  const today = getTodayDateString();
  const docId = `${mediaId}_${today}`;

  try {
    const logRef = doc(db, 'dailySearchLogs', docId);
    const logDoc = await getDoc(logRef);

    if (logDoc.exists()) {
      const data = logDoc.data();
      return {
        id: logDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as DailySearchLog;
    }

    return null;
  } catch (error) {
    console.error('Error getting today search log:', error);
    return null;
  }
};

/**
 * 人気のキーワードを集計（直近N日間）
 * @param mediaId - メディアテナントID
 * @param days - 集計する日数（デフォルト: 30日）
 * @param limitCount - 取得件数（デフォルト: 10）
 */
export const getPopularSearchKeywords = async (
  mediaId: string,
  days: number = 30,
  limitCount: number = 10
): Promise<DailySearchLogItem[]> => {
  if (!db) {
    console.error('Firestore is not initialized');
    return [];
  }

  const endDate = getTodayDateString();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

  try {
    const logs = await getDailySearchLogs(mediaId, startDateStr, endDate);
    
    // 全キーワードを集計
    const keywordMap = new Map<string, DailySearchLogItem>();
    
    for (const log of logs) {
      for (const item of (log.keywords || [])) {
        const existing = keywordMap.get(item.value);
        if (existing) {
          existing.count += item.count;
        } else {
          keywordMap.set(item.value, { ...item });
        }
      }
    }

    // カウントでソートして上位を返す
    return Array.from(keywordMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting popular search keywords:', error);
    return [];
  }
};

/**
 * 人気のタグを集計（直近N日間）
 * @param mediaId - メディアテナントID
 * @param days - 集計する日数（デフォルト: 30日）
 * @param limitCount - 取得件数（デフォルト: 10）
 */
export const getPopularSearchTags = async (
  mediaId: string,
  days: number = 30,
  limitCount: number = 10
): Promise<DailySearchLogItem[]> => {
  if (!db) {
    console.error('Firestore is not initialized');
    return [];
  }

  const endDate = getTodayDateString();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

  try {
    const logs = await getDailySearchLogs(mediaId, startDateStr, endDate);
    
    // 全タグを集計
    const tagMap = new Map<string, DailySearchLogItem>();
    
    for (const log of logs) {
      for (const item of (log.tags || [])) {
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
    console.error('Error getting popular search tags:', error);
    return [];
  }
};

