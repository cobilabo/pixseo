/**
 * WordPress移行ロールバックスクリプト
 * 
 * 機能:
 * - wpMigrated: true のフラグが付いたデータを削除
 * - 対象: articles, pages, categories, tags, writers, mediaLibrary
 * - Firebase Storageの画像も削除可能
 * 
 * 使用方法:
 * npx tsx scripts/rollback-wordpress-migration.ts --mediaId=YOUR_MEDIA_ID
 * 
 * オプション:
 * --mediaId       : 必須。対象テナントID
 * --dryRun        : 実際に削除せず、対象データを確認のみ
 * --includeStorage: Firebase Storageの画像も削除
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Firebase Admin SDK の初期化
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixseo-1eeef',
    storageBucket: 'pixseo-1eeef.firebasestorage.app',
  });
}

const db = admin.firestore();
const storage = admin.storage();

// コマンドライン引数の解析
function parseArgs(): { mediaId: string; dryRun: boolean; includeStorage: boolean } {
  const args = process.argv.slice(2);
  let mediaId = '';
  let dryRun = false;
  let includeStorage = false;

  for (const arg of args) {
    if (arg.startsWith('--mediaId=')) {
      mediaId = arg.split('=')[1];
    } else if (arg === '--dryRun') {
      dryRun = true;
    } else if (arg === '--includeStorage') {
      includeStorage = true;
    }
  }

  if (!mediaId) {
    console.error('Error: --mediaId is required');
    console.log('\nUsage: npx tsx scripts/rollback-wordpress-migration.ts --mediaId=YOUR_MEDIA_ID [--dryRun] [--includeStorage]');
    process.exit(1);
  }

  return { mediaId, dryRun, includeStorage };
}

interface RollbackResult {
  collection: string;
  count: number;
  ids: string[];
}

/**
 * コレクションから移行データを削除
 */
async function rollbackCollection(
  collectionName: string,
  mediaId: string,
  dryRun: boolean
): Promise<RollbackResult> {
  console.log(`\n📂 Processing ${collectionName}...`);
  
  const snapshot = await db.collection(collectionName)
    .where('mediaId', '==', mediaId)
    .where('wpMigrated', '==', true)
    .get();
  
  const ids: string[] = [];
  
  if (snapshot.empty) {
    console.log(`  No migrated data found`);
    return { collection: collectionName, count: 0, ids: [] };
  }
  
  console.log(`  Found ${snapshot.size} migrated documents`);
  
  // バッチ削除（500件ずつ）
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    ids.push(doc.id);
    
    if (dryRun) {
      const data = doc.data();
      console.log(`    [DRY RUN] Would delete: ${doc.id} (${data.title || data.name || data.handleName || data.slug || 'unknown'})`);
    } else {
      batch.delete(doc.ref);
      batchCount++;
      
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`    Deleted ${batchCount} documents...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
  }
  
  // 残りのバッチをコミット
  if (!dryRun && batchCount > 0) {
    await batch.commit();
    console.log(`    Deleted ${batchCount} documents`);
  }
  
  console.log(`  ✅ ${dryRun ? 'Would delete' : 'Deleted'}: ${snapshot.size} documents`);
  
  return { collection: collectionName, count: snapshot.size, ids };
}

/**
 * Firebase Storageから移行画像を削除
 */
async function rollbackStorage(
  mediaId: string,
  mediaLibraryIds: string[],
  dryRun: boolean
): Promise<number> {
  console.log(`\n🗄️  Processing Firebase Storage...`);
  
  if (mediaLibraryIds.length === 0) {
    console.log(`  No media files to delete`);
    return 0;
  }
  
  // mediaLibraryからURLを取得（削除前に取得しておく必要がある）
  const bucket = storage.bucket();
  let deletedCount = 0;
  
  // mediaLibraryの各ドキュメントからURLを取得して削除
  for (const docId of mediaLibraryIds) {
    const doc = await db.collection('mediaLibrary').doc(docId).get();
    if (!doc.exists) continue;
    
    const data = doc.data();
    if (!data) continue;
    
    const urls = [data.url, data.thumbnailUrl].filter(Boolean);
    
    for (const url of urls) {
      try {
        // URLからファイルパスを抽出
        const match = url.match(/\/o\/(.+?)\?/);
        if (!match) continue;
        
        const filePath = decodeURIComponent(match[1]);
        
        if (dryRun) {
          console.log(`    [DRY RUN] Would delete: ${filePath}`);
        } else {
          await bucket.file(filePath).delete();
          console.log(`    Deleted: ${filePath}`);
        }
        deletedCount++;
      } catch (error) {
        // ファイルが存在しない場合は無視
        console.log(`    Skipped (not found): ${url}`);
      }
    }
  }
  
  console.log(`  ✅ ${dryRun ? 'Would delete' : 'Deleted'}: ${deletedCount} files`);
  
  return deletedCount;
}

/**
 * メイン処理
 */
async function main() {
  const { mediaId, dryRun, includeStorage } = parseArgs();
  
  console.log('============================================================');
  console.log('WordPress移行ロールバックスクリプト');
  console.log('============================================================');
  console.log(`\nTarget mediaId: ${mediaId}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Include storage: ${includeStorage}`);
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE: No data will be deleted');
  } else {
    console.log('\n🚨 WARNING: This will permanently delete migrated data!');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // テナント存在確認
  const tenantDoc = await db.collection('mediaTenants').doc(mediaId).get();
  if (!tenantDoc.exists) {
    console.error(`\n❌ Error: mediaTenant "${mediaId}" not found`);
    process.exit(1);
  }
  
  console.log(`\n✅ Found tenant: ${tenantDoc.data()?.name}`);
  
  const results: RollbackResult[] = [];
  
  try {
    // 各コレクションからデータを削除
    // mediaLibraryは先に取得しておく（Storageの削除に必要）
    const mediaLibraryResult = await rollbackCollection('mediaLibrary', mediaId, dryRun || includeStorage);
    results.push(mediaLibraryResult);
    
    // Storageから画像を削除（オプション）
    let storageDeleteCount = 0;
    if (includeStorage && mediaLibraryResult.ids.length > 0) {
      // Storage削除前にmediaLibraryのデータを取得
      const mediaSnapshot = await db.collection('mediaLibrary')
        .where('mediaId', '==', mediaId)
        .where('wpMigrated', '==', true)
        .get();
      
      const mediaUrls: { url?: string; thumbnailUrl?: string }[] = [];
      mediaSnapshot.docs.forEach(doc => {
        const data = doc.data();
        mediaUrls.push({ url: data.url, thumbnailUrl: data.thumbnailUrl });
      });
      
      storageDeleteCount = await rollbackStorageByUrls(mediaUrls, dryRun);
    }
    
    // mediaLibraryを実際に削除（Storage削除後）
    if (!dryRun && includeStorage) {
      // 上で既にStorage削除したので、ここでmediaLibraryを削除
      await rollbackCollection('mediaLibrary', mediaId, false);
    }
    
    // 他のコレクションを削除
    results.push(await rollbackCollection('articles', mediaId, dryRun));
    results.push(await rollbackCollection('pages', mediaId, dryRun));
    results.push(await rollbackCollection('categories', mediaId, dryRun));
    results.push(await rollbackCollection('tags', mediaId, dryRun));
    results.push(await rollbackCollection('writers', mediaId, dryRun));
    
    // 結果サマリー
    console.log('\n============================================================');
    console.log('Rollback completed!');
    console.log('============================================================');
    
    let totalCount = 0;
    for (const result of results) {
      console.log(`${result.collection}: ${result.count} documents`);
      totalCount += result.count;
    }
    if (includeStorage) {
      console.log(`Storage files: ${storageDeleteCount} files`);
    }
    console.log(`\nTotal: ${totalCount} documents ${dryRun ? 'would be' : ''} deleted`);
    
    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No data was actually deleted.');
      console.log('Run without --dryRun to perform the actual rollback.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during rollback:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

/**
 * URLからFirebase Storageのファイルを削除
 */
async function rollbackStorageByUrls(
  mediaItems: { url?: string; thumbnailUrl?: string }[],
  dryRun: boolean
): Promise<number> {
  console.log(`\n🗄️  Processing Firebase Storage...`);
  
  if (mediaItems.length === 0) {
    console.log(`  No media files to delete`);
    return 0;
  }
  
  const bucket = storage.bucket();
  let deletedCount = 0;
  
  for (const item of mediaItems) {
    const urls = [item.url, item.thumbnailUrl].filter(Boolean) as string[];
    
    for (const url of urls) {
      try {
        // URLからファイルパスを抽出
        const match = url.match(/\/o\/(.+?)\?/);
        if (!match) continue;
        
        const filePath = decodeURIComponent(match[1]);
        
        if (dryRun) {
          console.log(`    [DRY RUN] Would delete: ${filePath}`);
        } else {
          await bucket.file(filePath).delete();
          console.log(`    Deleted: ${filePath}`);
        }
        deletedCount++;
      } catch (error) {
        // ファイルが存在しない場合は無視
      }
    }
  }
  
  console.log(`  ✅ ${dryRun ? 'Would delete' : 'Deleted'}: ${deletedCount} files`);
  
  return deletedCount;
}

main();

