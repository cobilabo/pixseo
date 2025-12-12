/**
 * スケジュール実行関数
 * Next.jsを使用しない軽量な関数のみを含む
 */
/**
 * 予約公開記事を公開する定期実行関数
 * 毎日 JST 0:00 (UTC 15:00) に実行
 * isScheduled: true かつ publishedAt が今日以前の記事を公開状態に更新
 */
export declare const publishScheduledArticles: import("firebase-functions/v2/scheduler").ScheduleFunction;
