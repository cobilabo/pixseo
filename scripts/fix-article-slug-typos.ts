/**
 * 記事スラグのタイポを修正するスクリプト
 *
 * SEO 監査で発見された記事 slug のタイポ（trip-sightseeing が重複している等）を
 * 一括で修正する。middleware.ts 側の ARTICLE_SLUG_REDIRECTS と対になっており、
 * Firestore 側の slug を新値に更新したあとも、旧 slug への直接アクセスは
 * middleware が 301 リダイレクトする。
 *
 * 使用方法:
 *   npx tsx scripts/fix-article-slug-typos.ts [--dryRun]
 *
 * 注意: Firebase Admin の認証情報が必要。
 *       pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json をプロジェクトルートに配置する。
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixseo-1eeef',
  });
}

const db = admin.firestore();

/**
 * 旧 slug → 新 slug マッピング。middleware.ts の ARTICLE_SLUG_REDIRECTS と一致させること。
 */
const SLUG_FIXES: Record<string, string> = {
  'trip-sightseeingrip-sightseeing-accessible-tourism': 'trip-sightseeing-accessible-tourism',
  'trip-sightseeingrip-rental-welfare-vehicles': 'trip-rental-welfare-vehicles',
  // NOTE: 'trip-sightseeingrip-sightseeing-osaka-expo' は別 slug 候補が
  // 既存記事と衝突するため、別 slug 決定後に再追加する
};

interface FixResult {
  id: string;
  oldSlug: string;
  newSlug: string;
  title: string;
}

function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dryRun'),
  };
}

async function main() {
  const { dryRun } = parseArgs();

  console.log('='.repeat(60));
  console.log('記事スラグタイポ修正スクリプト');
  console.log('='.repeat(60));
  console.log(`Dry run: ${dryRun}\n`);

  const fixes: FixResult[] = [];

  for (const [oldSlug, newSlug] of Object.entries(SLUG_FIXES)) {
    const snapshot = await db
      .collection('articles')
      .where('slug', '==', oldSlug)
      .get();

    if (snapshot.empty) {
      console.log(`  - "${oldSlug}" に該当する記事は見つかりませんでした`);
      continue;
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      fixes.push({
        id: doc.id,
        oldSlug,
        newSlug,
        title: data.title || '(no title)',
      });
    }
  }

  if (fixes.length === 0) {
    console.log('修正が必要な記事はありません。');
    return;
  }

  console.log(`\n変更予定 (${fixes.length} 件):`);
  console.log('-'.repeat(60));
  for (const fix of fixes) {
    console.log(`  ID: ${fix.id}`);
    console.log(`  Title: ${fix.title}`);
    console.log(`  旧 slug: ${fix.oldSlug}`);
    console.log(`  新 slug: ${fix.newSlug}`);
    console.log('');
  }

  if (dryRun) {
    console.log('\n⚠️  これは dry run です。実際の更新は行われていません。');
    console.log('実際に更新するには --dryRun を外して実行してください。');
    return;
  }

  console.log('\n更新を実行中...');
  const batch = db.batch();
  for (const fix of fixes) {
    const ref = db.collection('articles').doc(fix.id);
    batch.update(ref, {
      slug: fix.newSlug,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  console.log(`\n✅ ${fixes.length} 件の記事 slug を更新しました。`);
  console.log('middleware.ts の ARTICLE_SLUG_REDIRECTS により、旧 slug は 301 リダイレクトされます。');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
