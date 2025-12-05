/**
 * スラッグで記事を検索するスクリプト
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
const SEARCH_SLUG = process.argv[2] || '';

async function main() {
  console.log('='.repeat(60));
  console.log(`スラッグ検索: "${SEARCH_SLUG}"`);
  console.log('='.repeat(60));

  if (!SEARCH_SLUG) {
    console.log('使用方法: npx tsx scripts/find-article-by-slug.ts <slug>');
    return;
  }

  // 完全一致で検索
  const exactMatch = await db.collection('articles')
    .where('mediaId', '==', MEDIA_ID)
    .where('slug', '==', SEARCH_SLUG)
    .limit(1)
    .get();

  if (!exactMatch.empty) {
    const doc = exactMatch.docs[0];
    const data = doc.data();
    console.log('\n✅ 完全一致の記事が見つかりました:');
    console.log(`  ID: ${doc.id}`);
    console.log(`  タイトル: ${data.title}`);
    console.log(`  スラッグ: ${data.slug}`);
    console.log(`  公開状態: ${data.isPublished ? '公開' : '非公開'}`);
    console.log(`  作成日: ${data.createdAt?.toDate?.() || data.createdAt}`);
    return;
  }

  console.log('\n❌ 完全一致の記事が見つかりませんでした。');
  
  // 部分一致で検索
  console.log('\n--- 類似スラッグを検索 ---');
  const allArticles = await db.collection('articles')
    .where('mediaId', '==', MEDIA_ID)
    .get();

  const searchLower = SEARCH_SLUG.toLowerCase();
  const similarSlugs = allArticles.docs
    .filter(doc => {
      const slug = doc.data().slug?.toLowerCase() || '';
      return slug.includes(searchLower) || searchLower.includes(slug) || 
             slug.includes('wheelchair') || slug.includes('travel');
    })
    .map(doc => ({
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

  // wheelchair または travel を含むスラッグをリストアップ
  console.log('\n--- wheelchair/travel を含むスラッグ ---');
  const relatedSlugs = allArticles.docs
    .filter(doc => {
      const slug = doc.data().slug?.toLowerCase() || '';
      return slug.includes('wheelchair') || slug.includes('travel');
    })
    .map(doc => ({
      slug: doc.data().slug,
      title: doc.data().title,
    }));

  if (relatedSlugs.length > 0) {
    for (const article of relatedSlugs) {
      console.log(`  ${article.slug}`);
    }
  }
}

main().catch(console.error);

