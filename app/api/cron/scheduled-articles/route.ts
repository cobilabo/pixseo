import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分

/**
 * スケジュール設定に基づいて記事を自動生成するCron Job
 * 毎時0分に実行される
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cronからのリクエストか確認
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Scheduled article generation started');

    // 現在の日時を取得（JST）
    const now = new Date();
    const jstOffset = 9 * 60; // JSTはUTC+9
    const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000);
    
    const currentDayOfWeek = jstDate.getUTCDay().toString(); // 0=日曜, 1=月曜, ...
    const currentHour = jstDate.getUTCHours();
    const currentMinute = jstDate.getUTCMinutes();
    
    // 5分単位に丸める（例: 19:23 → 19:25）
    const roundedMinute = Math.round(currentMinute / 5) * 5;
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`;

    console.log(`[Cron] Current JST time: Day ${currentDayOfWeek}, Time ${currentTime}`);

    // アクティブなスケジュール設定を取得
    const schedulesSnapshot = await adminDb
      .collection('scheduledGenerations')
      .where('isActive', '==', true)
      .get();

    if (schedulesSnapshot.empty) {
      console.log('[Cron] No active schedules found');
      return NextResponse.json({ 
        message: 'No active schedules',
        executed: 0 
      });
    }

    console.log(`[Cron] Found ${schedulesSnapshot.size} active schedules`);

    // 現在の曜日と時刻に一致するスケジュールをフィルタリング
    const matchingSchedules = schedulesSnapshot.docs.filter(doc => {
      const schedule = doc.data();
      const daysOfWeek = schedule.daysOfWeek || [];
      const timeOfDay = schedule.timeOfDay || '';

      console.log(`[Cron] Checking schedule ${doc.id}:`, {
        scheduleDays: daysOfWeek,
        scheduleTime: timeOfDay,
        currentDay: currentDayOfWeek,
        currentTime,
        dayMatch: daysOfWeek.includes(currentDayOfWeek),
        timeMatch: timeOfDay === currentTime,
      });

      return daysOfWeek.includes(currentDayOfWeek) && timeOfDay === currentTime;
    });

    console.log(`[Cron] Found ${matchingSchedules.length} matching schedules`);

    if (matchingSchedules.length === 0) {
      return NextResponse.json({ 
        message: 'No matching schedules for current time',
        currentDayOfWeek,
        currentTime,
        executed: 0
      });
    }

    // 各スケジュールについて記事生成を実行
    const results = await Promise.allSettled(
      matchingSchedules.map(async (scheduleDoc) => {
        const schedule = scheduleDoc.data();
        const scheduleId = scheduleDoc.id;

        console.log(`[Cron] Executing schedule: ${scheduleId} (${schedule.name})`);

        try {
          // 共通関数を直接呼び出し（HTTP不要）
          const { generateAdvancedArticle } = await import('@/lib/article-generation/generate-advanced');
          
          const result = await generateAdvancedArticle({
            mediaId: schedule.mediaId,
            categoryId: schedule.categoryId,
            writerId: schedule.writerId,
            imagePromptPatternId: schedule.imagePromptPatternId,
          });

          // 最終実行時刻を更新
          await adminDb.collection('scheduledGenerations').doc(scheduleId).update({
            lastExecutedAt: new Date(),
          });

          console.log(`[Cron] Successfully generated article for schedule: ${scheduleId}`);
          return { scheduleId, success: true, articleId: result.articleId };
        } catch (error: any) {
          console.error(`[Cron] Failed to generate article for schedule ${scheduleId}:`, error);
          return { scheduleId, success: false, error: error.message };
        }
      })
    );

    // 成功/失敗をカウント
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`[Cron] Completed: ${succeeded} succeeded, ${failed} failed`);

    return NextResponse.json({
      message: 'Scheduled article generation completed',
      currentDayOfWeek,
      currentTime,
      executed: matchingSchedules.length,
      succeeded,
      failed,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'rejected' }),
    });
  } catch (error: any) {
    console.error('[Cron] Error in scheduled article generation:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

