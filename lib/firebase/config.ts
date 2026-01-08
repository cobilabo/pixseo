import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

// 環境変数が未設定の場合はデフォルト値を使用
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDi8DiIdhLCJO9bXAzBGdeKwBBi7gYPXHs',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'ayumi-f6bd2.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ayumi-f6bd2',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ayumi-f6bd2.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '561071971625',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:561071971625:web:0e382383fbb444c0066b38',
};

// 環境変数はfallback値で設定済み（警告不要）

// Firebase初期化（遅延初期化でクライアント側のみ）
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let auth: Auth | undefined;

// 初期化関数（クライアント側で呼ばれた時に初期化）
function initializeFirebase() {
  if (typeof window === 'undefined') {
    return; // サーバー側では何もしない
  }

  if (!app) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  }

  if (!db && app) {
    db = getFirestore(app);
  }
  
  if (!storage && app) {
    storage = getStorage(app);
  }
  
  if (!auth && app) {
    auth = getAuth(app);
  }
}

// エクスポート時に初期化を試みる
if (typeof window !== 'undefined') {
  initializeFirebase();
}

export { app, db, storage, auth, initializeFirebase };

