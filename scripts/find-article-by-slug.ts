/**
 * スラッグで記事を検索し、WP 移行フラグ等を表示する。
 *
 * Usage:
 *   npx tsx scripts/find-article-by-slug.ts <slug> [mediaId]
 *
 * mediaId を省略すると、全テナントから slug 一致を最大 25 件返す。
 */
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

function resolveServiceAccountPath(): string {
  const root = path.join(__dirname, '..');
  const candidates = [
    path.join(root, 'serviceAccountKey.json'),
    path.join(root, 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'サービスアカウント JSON が見つかりません。' +
      'serviceAccountKey.json または pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json をプロジェクト直下に配置してください。',
  );
}

const serviceAccountPath = resolveServiceAccountPath();
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || 'pixseo-1eeef',
  });
}

const db = admin.firestore();

const DEFAULT_MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';

function tsLabel(v: unknown): string {
  if (v == null) return '(なし)';
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === 'function') {
    try {
      return t.toDate()!.toISOString();
    } catch {
      return String(v);
    }
  }
  if (v instanceof admin.firestore.Timestamp) {
    return v.toDate().toISOString();
  }
  return String(v);
}

async function main() {
  const SEARCH_SLUG = process.argv[2] || '';
  const MEDIA_ID = process.argv[3] || '';

  console.log('='.repeat(60));
  console.log(`スラッグ検索: "${SEARCH_SLUG}"`);
  if (MEDIA_ID) console.log(`mediaId フィルタ: ${MEDIA_ID}`);
  console.log('='.repeat(60));

  if (!SEARCH_SLUG) {
    console.log('使用方法: npx tsx scripts/find-article-by-slug.ts <slug> [mediaId]');
    return;
  }

  let snap;

  if (MEDIA_ID) {
    snap = await db
      .collection('articles')
      .where('mediaId', '==', MEDIA_ID)
      .where('slug', '==', SEARCH_SLUG)
      .limit(10)
      .get();
  } else {
    snap = await db.collection('articles').where('slug', '==', SEARCH_SLUG).limit(25).get();
  }

  if (!snap.empty) {
    console.log(`\n一致: ${snap.size} 件\n`);
    snap.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`--- [${i + 1}] id=${doc.id} ---`);
      console.log(`  タイトル: ${data.title}`);
      console.log(`  スラッグ: ${data.slug}`);
      console.log(`  mediaId: ${data.mediaId ?? '(なし)'}`);
      console.log(`  公開: ${data.isPublished ? 'はい' : 'いいえ'}`);
      console.log(`  publishedAt: ${tsLabel(data.publishedAt)}`);
      console.log(`  updatedAt: ${tsLabel(data.updatedAt)}`);
      console.log(`  createdAt: ${tsLabel(data.createdAt)}`);
      console.log(`  wpMigrated: ${data.wpMigrated === true ? 'true' : data.wpMigrated === false ? 'false' : '(フィールドなし)'}`);
      console.log(`  wpMigratedAt: ${tsLabel(data.wpMigratedAt)}`);
      console.log(`  wpOriginalId: ${data.wpOriginalId ?? '(なし)'}`);
      console.log(`  wpPermalink: ${data.wpPermalink ?? '(なし)'}`);
      console.log('');
    });
    return;
  }

  console.log('\n❌ 一致する記事がありませんでした。');

  const fallbackMedia = MEDIA_ID || DEFAULT_MEDIA_ID;
  console.log(`\n--- 参考: mediaId=${fallbackMedia} 配下で類似探索 ---`);
  const allArticles = await db.collection('articles').where('mediaId', '==', fallbackMedia).get();

  const searchLower = SEARCH_SLUG.toLowerCase();
  const similarSlugs = allArticles.docs
    .filter((doc) => {
      const slug = doc.data().slug?.toLowerCase() || '';
      return slug.includes(searchLower) || searchLower.includes(slug);
    })
    .map((doc) => ({
      id: doc.id,
      slug: doc.data().slug,
      title: doc.data().title,
      isPublished: doc.data().isPublished,
    }));

  if (similarSlugs.length > 0) {
    console.log(`\n類似スラッグ: ${similarSlugs.length} 件`);
    for (const article of similarSlugs.slice(0, 20)) {
      console.log(`  ${article.slug} - ${article.title} (${article.isPublished ? '公開' : '非公開'})`);
    }
  } else {
    console.log('類似スラッグは見つかりませんでした。');
  }
}

main().catch(console.error);
