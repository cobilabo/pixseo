import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分

/**
 * Cron実行用エンドポイント
 * 定期実行設定に基づいて記事を自動生成
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cronからの認証
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting scheduled article generation...');

    // 現在の曜日と時刻を取得（Asia/Tokyo）
    const now = new Date();
    const japanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const currentDay = japanTime.getDay(); // 0=日曜, 1=月曜, ...
    const currentHour = japanTime.getHours();
    const currentMinute = japanTime.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:00`; // HH:00形式

    console.log(`[Cron] Current time (JST): ${japanTime.toISOString()}, Day: ${currentDay}, Time: ${currentTime}`);

    // 実行対象の定期実行設定を取得
    const schedulesSnapshot = await adminDb
      .collection('scheduledGenerations')
      .where('isActive', '==', true)
      .get();

    const targetSchedules = schedulesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return (
        data.daysOfWeek.includes(currentDay) &&
        data.timeOfDay === currentTime &&
        data.timezone === 'Asia/Tokyo'
      );
    });

    console.log(`[Cron] Found ${targetSchedules.length} schedules to execute`);

    const results: Array<{
      scheduleId: string;
      scheduleName: string;
      success: boolean;
      articleId?: string;
      error?: string;
    }> = [];

    for (const scheduleDoc of targetSchedules) {
      const schedule = scheduleDoc.data();
      const scheduleId = scheduleDoc.id;

      console.log(`[Cron] Executing schedule: ${schedule.name} (${scheduleId})`);

      try {
        // 高度な記事生成APIを呼び出し
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/articles/generate-advanced`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-media-id': schedule.mediaId,
          },
          body: JSON.stringify({
            categoryId: schedule.categoryId,
            patternId: schedule.patternId,
            writerId: schedule.writerId,
            writingStyleId: schedule.writingStyleId,
            imagePromptPatternId: schedule.imagePromptPatternId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate article');
        }

        const data = await response.json();

        // 最終実行日時を更新
        await adminDb.collection('scheduledGenerations').doc(scheduleId).update({
          lastExecutedAt: new Date(),
        });

        results.push({
          scheduleId,
          scheduleName: schedule.name,
          success: true,
          articleId: data.articleId,
        });

        console.log(`[Cron] Successfully generated article for schedule: ${schedule.name}`);
      } catch (error) {
        console.error(`[Cron] Error generating article for schedule ${schedule.name}:`, error);

        results.push({
          scheduleId,
          scheduleName: schedule.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log('[Cron] Scheduled article generation completed');

    return NextResponse.json({
      success: true,
      executedAt: japanTime.toISOString(),
      schedulesExecuted: targetSchedules.length,
      results,
    });
  } catch (error) {
    console.error('[API /cron/generate-articles] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute scheduled generation', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

