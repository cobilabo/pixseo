/**
 * 指定したユーザーをsuper_adminに設定するスクリプト
 * 
 * 使用方法:
 * GOOGLE_APPLICATION_CREDENTIALS="./pixseo-1eeef-firebase-adminsdk-xxxxx.json" \
 * USER_EMAIL="your-email@example.com" \
 * npm run set-super-admin
 */

import * as admin from 'firebase-admin';

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    : admin.credential.applicationDefault();

  admin.initializeApp({
    credential,
    projectId: 'pixseo-1eeef',
    storageBucket: 'pixseo-1eeef.firebasestorage.app',
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function setSuperAdmin() {
  try {
    const userEmail = process.env.USER_EMAIL;
    
    if (!userEmail) {
      console.error('❌ USER_EMAIL環境変数が設定されていません');
      console.log('使用方法:');
      console.log('USER_EMAIL="your-email@example.com" npm run set-super-admin');
      process.exit(1);
    }

    console.log(`🔍 ユーザーを検索中: ${userEmail}`);
    
    // Firebase Authenticationからユーザーを取得
    const userRecord = await auth.getUserByEmail(userEmail);
    console.log(`✅ ユーザーが見つかりました: ${userRecord.uid}`);

    // Firestoreにユーザードキュメントを作成/更新
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      role: 'super_admin',
      displayName: userRecord.displayName || '',
      mediaIds: [], // super_adminはすべてのメディアにアクセス可能
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('🎉 super_admin権限を付与しました！');
    console.log('');
    console.log('✨ これで以下の機能にアクセスできるようになりました:');
    console.log('  - サービス管理（メディアテナント管理）');
    console.log('  - ダッシュボード上部のサービス選択プルダウン');
    console.log('');
    console.log('再ログインして変更を反映してください。');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

setSuperAdmin();

