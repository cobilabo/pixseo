/**
 * Firestore コレクション移行スクリプト
 * tenants → mediaTenants
 * 
 * 実行方法:
 * 1. Firebase Consoleからサービスアカウントキーをダウンロード
 * 2. プロジェクトルートに serviceAccountKey.json として配置
 * 3. npm run migrate:tenants を実行
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Firebase Admin SDKの初期化
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ エラー: serviceAccountKey.json が見つかりません');
  console.error('');
  console.error('以下の手順でサービスアカウントキーを取得してください：');
  console.error('1. Firebase Console → プロジェクト設定 → サービスアカウント');
  console.error('2. 「新しい秘密鍵の生成」をクリック');
  console.error('3. ダウンロードしたJSONファイルを以下に配置：');
  console.error(`   ${serviceAccountPath}`);
  console.error('');
  process.exit(1);
}

// Firebase Admin SDK初期化
if (!admin.apps.length) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const adminDb = admin.firestore();

async function migrateTenants() {
  console.log('='.repeat(60));
  console.log('🚀 Firestore コレクション移行開始');
  console.log('   tenants → mediaTenants');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. tenants コレクションからデータを取得
    console.log('[1/4] tenants コレクションを確認中...');
    const tenantsSnapshot = await adminDb.collection('tenants').get();
    
    if (tenantsSnapshot.empty) {
      console.log('⚠️  tenants コレクションにデータが見つかりませんでした。');
      console.log('   移行は不要です。');
      return;
    }
    
    console.log(`✅ ${tenantsSnapshot.size} 件のドキュメントを発見`);
    console.log('');

    // 2. mediaTenants コレクションの既存データを確認
    console.log('[2/4] mediaTenants コレクションを確認中...');
    const mediaTenantsSnapshot = await adminDb.collection('mediaTenants').get();
    console.log(`   既存のドキュメント数: ${mediaTenantsSnapshot.size}`);
    console.log('');

    // 3. データを移行
    console.log('[3/4] データ移行中...');
    let successCount = 0;
    let errorCount = 0;

    for (const doc of tenantsSnapshot.docs) {
      try {
        const data = doc.data();
        
        // allowIndexing フィールドがない場合はデフォルト値を追加
        if (data.allowIndexing === undefined) {
          data.allowIndexing = false;
        }
        
        // mediaTenants コレクションにコピー
        await adminDb.collection('mediaTenants').doc(doc.id).set(data, { merge: true });
        
        successCount++;
        console.log(`   ✅ [${successCount}/${tenantsSnapshot.size}] ${doc.id}`);
        console.log(`      - name: ${data.name || 'N/A'}`);
        console.log(`      - slug: ${data.slug || 'N/A'}`);
        console.log(`      - allowIndexing: ${data.allowIndexing}`);
        console.log('');
      } catch (error) {
        errorCount++;
        console.error(`   ❌ エラー: ${doc.id}`);
        console.error(`      ${error}`);
        console.log('');
      }
    }

    // 4. 結果サマリー
    console.log('[4/4] 移行完了');
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 移行結果サマリー');
    console.log('='.repeat(60));
    console.log(`   総ドキュメント数: ${tenantsSnapshot.size}`);
    console.log(`   成功: ${successCount}`);
    console.log(`   失敗: ${errorCount}`);
    console.log('');
    
    if (successCount > 0) {
      console.log('✅ 移行が正常に完了しました！');
      console.log('');
      console.log('📝 次のステップ:');
      console.log('   1. Firebase Console で mediaTenants コレクションを確認');
      console.log('   2. https://flat.pixseo.cloud/ にアクセスして動作確認');
      console.log('   3. 問題なければ tenants コレクションを削除（任意）');
    } else {
      console.log('⚠️  移行に失敗したドキュメントがあります。');
      console.log('   エラーメッセージを確認してください。');
    }
    
    console.log('');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ 致命的なエラーが発生しました');
    console.error('='.repeat(60));
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

// スクリプト実行
migrateTenants()
  .then(() => {
    console.log('🎉 スクリプトが正常に終了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ スクリプトが異常終了しました');
    console.error(error);
    process.exit(1);
  });

