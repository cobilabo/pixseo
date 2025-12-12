/**
 * スケジュール実行関数
 * Next.jsを使用しない軽量な関数のみを含む
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// Firebase Admin SDKの初期化
admin.initializeApp();

/**
 * 予約公開記事を公開する定期実行関数
 * 毎日 JST 0:00 (UTC 15:00) に実行
 * isScheduled: true かつ publishedAt が今日以前の記事を公開状態に更新
 */
export const publishScheduledArticles = onSchedule(
  {
    schedule: '0 15 * * *', // 毎日 UTC 15:00 = JST 0:00
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async () => {
    console.log('[publishScheduledArticles] Starting scheduled publication check...');
    
    const db = admin.firestore();
    const now = new Date();
    
    // JSTの今日の日付を取得（時刻は00:00:00）
    const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC + 9時間
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayJST = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());
    
    // 今日の終わり（23:59:59 JST）
    const todayEndJST = new Date(todayJST.getTime() + 24 * 60 * 60 * 1000 - 1);
    const todayEndUTC = new Date(todayEndJST.getTime() - jstOffset);
    
    console.log(`[publishScheduledArticles] Today (JST): ${todayJST.toISOString()}`);
    console.log(`[publishScheduledArticles] Today End (JST): ${todayEndJST.toISOString()}`);
    
    try {
      // 予約投稿記事を取得（isScheduled: true）
      // トップレベルの articles コレクションを使用
      const articlesSnapshot = await db.collection('articles')
        .where('isScheduled', '==', true)
        .get();
      
      console.log(`[publishScheduledArticles] Found ${articlesSnapshot.size} scheduled articles to check`);
      
      let publishedCount = 0;
      const batch = db.batch();
      
      for (const doc of articlesSnapshot.docs) {
        const article = doc.data();
        const publishedAt = article.publishedAt?.toDate ? article.publishedAt.toDate() : new Date(article.publishedAt);
        
        console.log(`[publishScheduledArticles] Checking article: ${doc.id}, publishedAt: ${publishedAt.toISOString()}`);
        
        // 公開日が今日以前の場合のみ公開
        if (publishedAt <= todayEndUTC) {
          batch.update(doc.ref, {
            isPublished: true,
            isScheduled: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          publishedCount++;
          console.log(`[publishScheduledArticles] Article ${doc.id} will be published`);
        }
      }
      
      if (publishedCount > 0) {
        await batch.commit();
        console.log(`[publishScheduledArticles] Successfully published ${publishedCount} articles`);
      } else {
        console.log('[publishScheduledArticles] No articles to publish today');
      }
      
    } catch (error) {
      console.error('[publishScheduledArticles] Error:', error);
      throw error;
    }
  }
);







