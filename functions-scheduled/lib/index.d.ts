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
/**
 * WordPress移行記事をAlgoliaに同期するバッチ処理関数
 *
 * クエリパラメータ:
 * - offset: 開始位置（デフォルト: 0）
 * - limit: 処理件数（デフォルト: 10、最大: 50）
 * - skipTranslate: 翻訳をスキップするか（デフォルト: false）
 * - dryRun: 実際に更新せずプレビュー（デフォルト: false）
 *
 * 使用例:
 * https://syncwpmigratedarticles-xxxxx.asia-northeast1.run.app?offset=0&limit=10
 */
export declare const syncWpMigratedArticles: import("firebase-functions/v2/https").HttpsFunction;
/**
 * 未翻訳のWP移行記事を自動的に翻訳してAlgoliaに同期するスケジュール関数
 * 5分ごとに実行し、未翻訳記事がなくなるまで処理を続ける
 */
export declare const autoTranslateWpArticles: import("firebase-functions/v2/scheduler").ScheduleFunction;
