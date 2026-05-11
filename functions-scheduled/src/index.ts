/**
 * スケジュール実行関数
 * Next.jsを使用しない軽量な関数のみを含む
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { algoliasearch } from "algoliasearch";
import { syncArticleToAlgolia } from "./algolia-sync";

// Firebase Admin SDKの初期化
admin.initializeApp();

// Algolia 認証情報 (Secret Manager から取得)
// 初回デプロイ前に以下のコマンドで値をセットする必要あり:
//   firebase functions:secrets:set ALGOLIA_APP_ID
//   firebase functions:secrets:set ALGOLIA_ADMIN_KEY
const algoliaAppId = defineSecret("ALGOLIA_APP_ID");
const algoliaAdminKey = defineSecret("ALGOLIA_ADMIN_KEY");

/**
 * 予約公開記事を公開する定期実行関数
 * 毎日 JST 0:00 (UTC 15:00) に実行
 * isScheduled: true かつ publishedAt が今日以前の記事を公開状態に更新し、
 * Algolia へも `isPublished:true` で再同期する。
 */
export const publishScheduledArticles = onSchedule(
  {
    schedule: "0 15 * * *", // 毎日 UTC 15:00 = JST 0:00
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async () => {
    console.log("[publishScheduledArticles] Starting scheduled publication check...");

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
      const articlesSnapshot = await db.collection("articles").where("isScheduled", "==", true).get();

      console.log(`[publishScheduledArticles] Found ${articlesSnapshot.size} scheduled articles to check`);

      // 公開対象の doc を集める
      type Pending = { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData };
      const toPublish: Pending[] = [];
      for (const doc of articlesSnapshot.docs) {
        const article = doc.data();
        const publishedAt = article.publishedAt?.toDate
          ? article.publishedAt.toDate()
          : new Date(article.publishedAt);

        console.log(
          `[publishScheduledArticles] Checking article: ${doc.id}, publishedAt: ${publishedAt.toISOString()}`
        );

        if (publishedAt <= todayEndUTC) {
          toPublish.push({ ref: doc.ref, data: article });
          console.log(`[publishScheduledArticles] Article ${doc.id} will be published`);
        }
      }

      if (toPublish.length === 0) {
        console.log("[publishScheduledArticles] No articles to publish today");
        return;
      }

      // Firestore を一括更新
      const batch = db.batch();
      for (const p of toPublish) {
        batch.update(p.ref, { isPublished: true, isScheduled: false });
      }
      await batch.commit();
      console.log(`[publishScheduledArticles] Successfully published ${toPublish.length} articles`);

      // Algolia へ再同期 (公開化を反映)
      try {
        const client = algoliasearch(algoliaAppId.value(), algoliaAdminKey.value());
        let okCount = 0;
        let ngCount = 0;
        for (const p of toPublish) {
          try {
            const article = {
              ...p.data,
              id: p.ref.id,
              isPublished: true,
              isScheduled: false,
            };
            await syncArticleToAlgolia(client, db, article);
            okCount++;
          } catch (e) {
            ngCount++;
            console.error(`[publishScheduledArticles] Algolia sync error for ${p.ref.id}:`, e);
          }
        }
        console.log(`[publishScheduledArticles] Algolia resync done: ok=${okCount}, ng=${ngCount}`);
      } catch (e) {
        console.error("[publishScheduledArticles] Algolia client init / batch failed:", e);
      }
    } catch (error) {
      console.error("[publishScheduledArticles] Error:", error);
      throw error;
    }
  }
);