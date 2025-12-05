/**
 * ライターのアイコン画像をFirebase Storageに移行するスクリプト
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';
import sharp from 'sharp';

const serviceAccountPath = path.join(__dirname, '..', 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixseo-1eeef',
    storageBucket: 'pixseo-1eeef.firebasestorage.app',
  });
}

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

const MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';

// コマンドライン引数
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dryRun');

/**
 * 画像をダウンロード
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.log(`    ⚠️ ダウンロード失敗: ${response.status}`);
      return null;
    }
    
    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.log(`    ⚠️ ダウンロードエラー: ${error}`);
    return null;
  }
}

/**
 * 画像を最適化してアップロード
 */
async function uploadImage(buffer: Buffer, fileName: string): Promise<{ url: string; thumbnailUrl: string } | null> {
  try {
    // 画像を最適化（WebP変換、最大400px）
    const optimizedBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // サムネイル生成（150x150）
    const thumbnailBuffer = await sharp(buffer)
      .resize(150, 150, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const timestamp = Date.now();
    const mainPath = `media/writers/${timestamp}_${fileName}.webp`;
    const thumbnailPath = `media/writers/thumbnails/${timestamp}_${fileName}_thumb.webp`;

    // メイン画像をアップロード
    const mainFile = bucket.file(mainPath);
    await mainFile.save(optimizedBuffer, {
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
      },
    });

    // サムネイルをアップロード
    const thumbFile = bucket.file(thumbnailPath);
    await thumbFile.save(thumbnailBuffer, {
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
      },
    });

    // 署名付きURLを取得
    const [mainUrl] = await mainFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    const [thumbUrl] = await thumbFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    return { url: mainUrl, thumbnailUrl: thumbUrl };
  } catch (error) {
    console.log(`    ⚠️ アップロードエラー: ${error}`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ライターアイコン移行スクリプト');
  console.log('='.repeat(60));
  console.log(`\nDry run: ${DRY_RUN}\n`);

  // ライターを取得
  const writersSnapshot = await db.collection('writers')
    .where('mediaId', '==', MEDIA_ID)
    .get();

  console.log(`📝 Total writers: ${writersSnapshot.docs.length}\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const doc of writersSnapshot.docs) {
    const data = doc.data();
    const handleName = data.handleName || '';
    const iconUrl = data.icon || '';

    console.log(`\n処理中: ${handleName}`);
    console.log(`  現在のURL: ${iconUrl ? iconUrl.substring(0, 60) + '...' : '(未設定)'}`);

    // アイコンが未設定の場合はスキップ
    if (!iconUrl) {
      console.log('  ⏭️ スキップ: アイコン未設定');
      skippedCount++;
      continue;
    }

    // 既にFirebase StorageのURLの場合はスキップ
    if (iconUrl.includes('firebasestorage.googleapis.com') || iconUrl.includes('storage.googleapis.com')) {
      console.log('  ⏭️ スキップ: 既にFirebase Storage');
      skippedCount++;
      continue;
    }

    // Gravatarの場合はスキップ（外部サービスなので移行不要）
    if (iconUrl.includes('gravatar.com')) {
      console.log('  ⏭️ スキップ: Gravatar（移行不要）');
      skippedCount++;
      continue;
    }

    if (DRY_RUN) {
      console.log('  [DRY RUN] 移行対象');
      migratedCount++;
      continue;
    }

    // 画像をダウンロード
    console.log('  📥 ダウンロード中...');
    const buffer = await downloadImage(iconUrl);
    if (!buffer) {
      errorCount++;
      continue;
    }

    // アップロード
    console.log('  📤 アップロード中...');
    const slug = data.slug || handleName.replace(/\s+/g, '-').toLowerCase();
    const result = await uploadImage(buffer, slug);
    if (!result) {
      errorCount++;
      continue;
    }

    // Firestoreを更新
    console.log('  💾 Firestore更新中...');
    await db.collection('writers').doc(doc.id).update({
      icon: result.url,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`  ✅ 移行完了`);
    console.log(`    新URL: ${result.url.substring(0, 60)}...`);
    migratedCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('移行完了');
  console.log('='.repeat(60));
  console.log(`✅ 移行: ${migratedCount} 件`);
  console.log(`⏭️ スキップ: ${skippedCount} 件`);
  console.log(`❌ エラー: ${errorCount} 件`);

  if (DRY_RUN) {
    console.log('\n⚠️ これはドライランです。実際に移行するには --dryRun を外して実行してください。');
  }
}

main().catch(console.error);

