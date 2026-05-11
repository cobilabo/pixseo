"use strict";
/**
 * スケジュール実行関数
 * Next.jsを使用しない軽量な関数のみを含む
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishScheduledArticles = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const algoliasearch_1 = require("algoliasearch");
const algolia_sync_1 = require("./algolia-sync");
// Firebase Admin SDKの初期化
admin.initializeApp();
// Algolia 認証情報 (Secret Manager から取得)
// 初回デプロイ前に以下のコマンドで値をセットする必要あり:
//   firebase functions:secrets:set ALGOLIA_APP_ID
//   firebase functions:secrets:set ALGOLIA_ADMIN_KEY
const algoliaAppId = (0, params_1.defineSecret)("ALGOLIA_APP_ID");
const algoliaAdminKey = (0, params_1.defineSecret)("ALGOLIA_ADMIN_KEY");
/**
 * 予約公開記事を公開する定期実行関数
 * 毎日 JST 0:00 (UTC 15:00) に実行
 * isScheduled: true かつ publishedAt が今日以前の記事を公開状態に更新し、
 * Algolia へも `isPublished:true` で再同期する。
 */
exports.publishScheduledArticles = (0, scheduler_1.onSchedule)({
    schedule: "0 15 * * *", // 毎日 UTC 15:00 = JST 0:00
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
    secrets: [algoliaAppId, algoliaAdminKey],
}, async () => {
    var _a;
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
        const toPublish = [];
        for (const doc of articlesSnapshot.docs) {
            const article = doc.data();
            const publishedAt = ((_a = article.publishedAt) === null || _a === void 0 ? void 0 : _a.toDate)
                ? article.publishedAt.toDate()
                : new Date(article.publishedAt);
            console.log(`[publishScheduledArticles] Checking article: ${doc.id}, publishedAt: ${publishedAt.toISOString()}`);
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
            const client = (0, algoliasearch_1.algoliasearch)(algoliaAppId.value(), algoliaAdminKey.value());
            let okCount = 0;
            let ngCount = 0;
            for (const p of toPublish) {
                try {
                    const article = Object.assign(Object.assign({}, p.data), { id: p.ref.id, isPublished: true, isScheduled: false });
                    await (0, algolia_sync_1.syncArticleToAlgolia)(client, db, article);
                    okCount++;
                }
                catch (e) {
                    ngCount++;
                    console.error(`[publishScheduledArticles] Algolia sync error for ${p.ref.id}:`, e);
                }
            }
            console.log(`[publishScheduledArticles] Algolia resync done: ok=${okCount}, ng=${ngCount}`);
        }
        catch (e) {
            console.error("[publishScheduledArticles] Algolia client init / batch failed:", e);
        }
    }
    catch (error) {
        console.error("[publishScheduledArticles] Error:", error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map