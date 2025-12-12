import * as functions from 'firebase-functions/v2';
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

