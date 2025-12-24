import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { SearchLogType, DailySearchLogItem } from '@/types/search';

export const dynamic = 'force-dynamic';

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

// POST: 検索ログを記録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value, displayName, mediaId } = body as {
      type: SearchLogType;
      value: string;
      displayName?: string;
      mediaId: string;
    };

    // バリデーション
    if (!type || !value || !mediaId) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    if (type !== 'keyword' && type !== 'tag') {
      return NextResponse.json(
        { error: '無効な検索タイプです' },
        { status: 400 }
      );
    }

    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) {
      return NextResponse.json(
        { error: '検索値が空です' },
        { status: 400 }
      );
    }

    const today = getTodayDateString();
    const docId = `${mediaId}_${today}`;
    const fieldName = type === 'keyword' ? 'keywords' : 'tags';

    const logRef = adminDb.collection('dailySearchLogs').doc(docId);
    const logDoc = await logRef.get();

    if (logDoc.exists) {
      // 既存のドキュメントを更新
      const data = logDoc.data();
      const items: DailySearchLogItem[] = data?.[fieldName] || [];
      
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

      await logRef.update({
        [fieldName]: items,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // 新規ドキュメント作成
      const newItem: DailySearchLogItem = {
        value: normalizedValue,
        displayName: displayName || value,
        count: 1,
      };

      await logRef.set({
        date: today,
        mediaId,
        keywords: type === 'keyword' ? [newItem] : [],
        tags: type === 'tag' ? [newItem] : [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /search-log] Error:', error);
    return NextResponse.json(
      { error: error.message || '検索ログの記録に失敗しました' },
      { status: 500 }
    );
  }
}

// GET: 検索ログを取得（オプション：集計データ）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const type = searchParams.get('type') as SearchLogType | null;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'mediaId は必須です' },
        { status: 400 }
      );
    }

    // 日付範囲を計算
    const endDate = getTodayDateString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

    // ログを取得
    const logsSnapshot = await adminDb
      .collection('dailySearchLogs')
      .where('mediaId', '==', mediaId)
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 集計データを作成
    const keywordMap = new Map<string, DailySearchLogItem>();
    const tagMap = new Map<string, DailySearchLogItem>();

    for (const log of logs as any[]) {
      // キーワード集計
      if (!type || type === 'keyword') {
        for (const item of (log.keywords || [])) {
          const existing = keywordMap.get(item.value);
          if (existing) {
            existing.count += item.count;
          } else {
            keywordMap.set(item.value, { ...item });
          }
        }
      }

      // タグ集計
      if (!type || type === 'tag') {
        for (const item of (log.tags || [])) {
          const existing = tagMap.get(item.value);
          if (existing) {
            existing.count += item.count;
          } else {
            tagMap.set(item.value, { ...item });
          }
        }
      }
    }

    // ソートして上位を返す
    const popularKeywords = Array.from(keywordMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const popularTags = Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return NextResponse.json({
      popularKeywords,
      popularTags,
      totalDays: logs.length,
      dateRange: { start: startDateStr, end: endDate },
    });
  } catch (error: any) {
    console.error('[API /search-log GET] Error:', error);
    return NextResponse.json(
      { error: error.message || '検索ログの取得に失敗しました' },
      { status: 500 }
    );
  }
}

