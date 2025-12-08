import * as functions from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import next from 'next';
import * as path from 'path';

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

// Firebase Functions v2のシークレットを定義
const grokApiKey = defineSecret('GROK_API_KEY');
const openaiApiKey = defineSecret('OPENAI_API_KEY');

const dev = process.env.NODE_ENV !== 'production';
// Firebase Functionsにデプロイする際は、.nextディレクトリがFunctionsディレクトリにコピーされる
const distDir = path.join(__dirname, '../.next');

// 環境変数を設定
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'AIzaSyDi8DiIdhLCJO9bXAzBGdeKwBBi7gYPXHs';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'ayumi-f6bd2.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'ayumi-f6bd2';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'ayumi-f6bd2.firebasestorage.app';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '561071971625';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:561071971625:web:0e382383fbb444c0066b38';
process.env.NEXT_PUBLIC_SITE_URL = 'https://the-ayumi.jp';
process.env.NEXT_PUBLIC_MEDIA_BASE_PATH = '/media';

const nextApp = next({
  dev,
  conf: { 
    distDir: distDir,
  },
});

const nextHandler = nextApp.getRequestHandler();

// Next.jsアプリの準備（一度だけ実行）
let isPrepared = false;
const prepareNextApp = async () => {
  if (!isPrepared) {
    await nextApp.prepare();
    isPrepared = true;
  }
};

export const nextjs = functions.https.onRequest(
  {
    region: 'asia-northeast1',
    memory: '2GiB',
    timeoutSeconds: 120,
    secrets: [grokApiKey, openaiApiKey], // シークレットを指定
  },
  async (request, response) => {
    // シークレットを環境変数として設定（Next.jsアプリからアクセス可能にする）
    process.env.GROK_API_KEY = grokApiKey.value();
    process.env.OPENAI_API_KEY = openaiApiKey.value();
    try {
      const host = request.headers.host || '';
      const url = request.url || '/';
      
      console.log(`[Next.js] Request: ${request.method} ${url}`);
      console.log(`[Next.js] Host: ${host}`);
      
      await prepareNextApp();
      
      // 管理画面のURL（ayumi-f6bd2-admin.web.app）にアクセスした場合
      const isAdminSite = host.includes('ayumi-f6bd2-admin') || 
                         host.includes('admin') ||
                         host === 'ayumi-f6bd2-admin.web.app';
      
      console.log(`[Next.js] Is Admin Site: ${isAdminSite}`);
      
      // 管理画面のURLで、ルートパス（/）または /media にアクセスした場合は /admin にリダイレクト
      if (isAdminSite && (url === '/' || url.startsWith('/media'))) {
        console.log(`[Next.js] Redirecting to /admin`);
        response.writeHead(302, { 
          Location: '/admin',
          'Cache-Control': 'no-cache'
        });
        response.end();
        return;
      }
      
      // 管理画面のURLで、/admin にアクセスした場合はそのまま処理
      if (isAdminSite && url.startsWith('/admin')) {
        return nextHandler(request, response);
      }
      
      return nextHandler(request, response);
    } catch (error) {
      console.error('[Next.js] Error in handler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('[Next.js] Error details:', {
        message: errorMessage,
        stack: errorStack,
        url: request.url,
        method: request.method,
      });
      
      // エラーレスポンスを返す
      if (!response.headersSent) {
        response.status(500).json({
          error: 'Internal Server Error',
          message: errorMessage,
          ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
        });
      }
    }
  });

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
    
    // UTCに戻す（比較用）
    const todayUTC = new Date(todayJST.getTime() - jstOffset);
    // 今日の終わり（23:59:59 JST）
    const todayEndJST = new Date(todayJST.getTime() + 24 * 60 * 60 * 1000 - 1);
    const todayEndUTC = new Date(todayEndJST.getTime() - jstOffset);
    
    console.log(`[publishScheduledArticles] Today (JST): ${todayJST.toISOString()}`);
    console.log(`[publishScheduledArticles] Today End (JST): ${todayEndJST.toISOString()}`);
    
    try {
      // 全メディアの記事を取得（isScheduled: true かつ publishedAt <= 今日）
      const articlesSnapshot = await db.collectionGroup('articles')
        .where('isScheduled', '==', true)
        .where('publishedAt', '<=', todayEndUTC)
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
