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
    const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;

    console.log(`[Cron] Current JST time: ${currentDayOfWeek} (day), ${currentTime} (hour)`);

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

    // 現在の曜日と時刻に一致するスケジュールをフィルタリング
    const matchingSchedules = schedulesSnapshot.docs.filter(doc => {
      const schedule = doc.data();
      const daysOfWeek = schedule.daysOfWeek || [];
      const timeOfDay = schedule.timeOfDay || '';

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
          // 既存のAI記事生成APIを内部的に呼び出す
          // Vercel内部では同じデプロイメントのAPIを直接呼び出せる
          const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

          const generateResponse = await fetch(`${baseUrl}/api/admin/articles/generate-advanced`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-media-id': schedule.mediaId,
            },
            body: JSON.stringify({
              categoryId: schedule.categoryId,
              patternId: schedule.patternId,
              writerId: schedule.writerId,
              imagePromptPatternId: schedule.imagePromptPatternId,
              targetAudience: schedule.targetAudience,
            }),
          });

          if (!generateResponse.ok) {
            const errorText = await generateResponse.text();
            throw new Error(`Article generation failed: ${errorText}`);
          }

          const result = await generateResponse.json();

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

