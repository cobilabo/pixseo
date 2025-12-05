/**
 * ライター情報を確認するスクリプト
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const serviceAccountPath = path.join(__dirname, '..', 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixseo-1eeef',
  });
}

const db = admin.firestore();

const MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';

async function main() {
  console.log('='.repeat(60));
  console.log('ライター情報確認');
  console.log('='.repeat(60));

  // ライターを取得
  const writersSnapshot = await db.collection('writers')
    .where('mediaId', '==', MEDIA_ID)
    .get();

  console.log(`\n📝 Total writers: ${writersSnapshot.docs.length}\n`);

  for (const doc of writersSnapshot.docs) {
    const data = doc.data();
    const handleName = data.handleName || data.slug || '';
    const slug = data.slug || '';
    const icon = data.icon || '';
    
    // murakami または akaishi を含むものを詳細表示
    if (handleName.toLowerCase().includes('murakami') || 
        handleName.toLowerCase().includes('akaishi') ||
        slug.toLowerCase().includes('murakami') ||
        slug.toLowerCase().includes('akaishi')) {
      console.log('='.repeat(40));
      console.log(`ライター: ${handleName}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  スラッグ: ${slug}`);
      console.log(`  アイコン: ${icon || '(未設定)'}`);
      console.log(`  背景画像: ${data.backgroundImage || '(未設定)'}`);
      console.log(`  wpMigrated: ${data.wpMigrated}`);
    }
  }

  // 全ライターのアイコン状態を確認
  console.log('\n\n--- 全ライターのアイコン状態 ---\n');
  for (const doc of writersSnapshot.docs) {
    const data = doc.data();
    const handleName = data.handleName || '';
    const icon = data.icon || '';
    const status = icon ? (icon.startsWith('http') ? '✅' : '⚠️') : '❌';
    console.log(`${status} ${handleName}: ${icon ? icon.substring(0, 80) + '...' : '(未設定)'}`);
  }
}

main().catch(console.error);

