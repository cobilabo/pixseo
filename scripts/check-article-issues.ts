/**
 * 記事の問題を確認するスクリプト
 * - スラッグの重複チェック
 * - 内部リンクの確認
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
  console.log('記事問題確認スクリプト');
  console.log('='.repeat(60));
  console.log(`\nTarget mediaId: ${MEDIA_ID}\n`);

  // 記事を取得
  const articlesSnapshot = await db.collection('articles')
    .where('mediaId', '==', MEDIA_ID)
    .get();

  console.log(`📝 Total articles: ${articlesSnapshot.docs.length}\n`);

  // 1. スラッグの重複チェック
  console.log('--- スラッグ重複チェック ---');
  const slugMap = new Map<string, string[]>();
  
  for (const doc of articlesSnapshot.docs) {
    const data = doc.data();
    const slug = data.slug || '';
    const title = data.title || '';
    
    if (!slugMap.has(slug)) {
      slugMap.set(slug, []);
    }
    slugMap.get(slug)!.push(`${doc.id}: ${title}`);
  }

  let duplicateCount = 0;
  for (const [slug, articles] of slugMap) {
    if (articles.length > 1) {
      duplicateCount++;
      console.log(`\n⚠️  重複スラッグ: "${slug}"`);
      for (const article of articles) {
        console.log(`    - ${article}`);
      }
    }
  }

  if (duplicateCount === 0) {
    console.log('✅ 重複スラッグはありません\n');
  } else {
    console.log(`\n⚠️  ${duplicateCount} 件の重複スラッグが見つかりました\n`);
  }

  // 2. 内部リンクの確認
  console.log('--- 内部リンク確認 ---');
  
  // 有効なスラッグのセット
  const validSlugs = new Set<string>();
  for (const doc of articlesSnapshot.docs) {
    const data = doc.data();
    if (data.slug) {
      validSlugs.add(data.slug);
    }
  }

  // WordPressドメインへのリンクをチェック
  const wpDomainPattern = /https?:\/\/the-ayumi\.jp/gi;
  const internalLinkPattern = /href=["'](\/[^"']+)["']/gi;
  const brokenLinks: { article: string; link: string }[] = [];
  const wpLinks: { article: string; link: string }[] = [];

  for (const doc of articlesSnapshot.docs) {
    const data = doc.data();
    const content = data.content || '';
    const title = data.title || '';

    // WordPressドメインへのリンク
    const wpMatches = content.match(wpDomainPattern);
    if (wpMatches) {
      for (const match of wpMatches) {
        wpLinks.push({ article: title, link: match });
      }
    }

    // 内部リンクのチェック（/article/xxx 形式）
    let match;
    const linkRegex = /href=["'](\/article\/([^"'\/]+))["']/gi;
    while ((match = linkRegex.exec(content)) !== null) {
      const fullLink = match[1];
      const slug = match[2];
      if (!validSlugs.has(slug)) {
        brokenLinks.push({ article: title, link: fullLink });
      }
    }
  }

  if (wpLinks.length > 0) {
    console.log(`\n⚠️  WordPressドメインへのリンク: ${wpLinks.length} 件`);
    // 最初の10件を表示
    for (const item of wpLinks.slice(0, 10)) {
      console.log(`    記事: ${item.article}`);
      console.log(`    リンク: ${item.link}`);
      console.log('');
    }
    if (wpLinks.length > 10) {
      console.log(`    ... 他 ${wpLinks.length - 10} 件`);
    }
  } else {
    console.log('✅ WordPressドメインへのリンクはありません');
  }

  if (brokenLinks.length > 0) {
    console.log(`\n⚠️  存在しない記事へのリンク: ${brokenLinks.length} 件`);
    for (const item of brokenLinks.slice(0, 10)) {
      console.log(`    記事: ${item.article}`);
      console.log(`    リンク: ${item.link}`);
      console.log('');
    }
    if (brokenLinks.length > 10) {
      console.log(`    ... 他 ${brokenLinks.length - 10} 件`);
    }
  } else {
    console.log('✅ 存在しない記事へのリンクはありません');
  }

  // 3. 内部リンクのパターン確認
  console.log('\n--- 内部リンクパターン確認 ---');
  const linkPatterns = new Map<string, number>();
  
  for (const doc of articlesSnapshot.docs) {
    const data = doc.data();
    const content = data.content || '';
    
    // href属性を抽出
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRegex.exec(content)) !== null) {
      const href = hrefMatch[1];
      
      // パターンを判定
      let pattern = 'other';
      if (href.startsWith('/article/')) {
        pattern = '/article/[slug]';
      } else if (href.startsWith('/category/')) {
        pattern = '/category/[slug]';
      } else if (href.startsWith('/tag/')) {
        pattern = '/tag/[slug]';
      } else if (href.startsWith('/writer/')) {
        pattern = '/writer/[id]';
      } else if (href.startsWith('/')) {
        pattern = '/[other]';
      } else if (href.startsWith('https://the-ayumi.jp')) {
        pattern = 'WP: the-ayumi.jp';
      } else if (href.startsWith('http')) {
        pattern = 'external';
      } else if (href.startsWith('#')) {
        pattern = 'anchor';
      }
      
      linkPatterns.set(pattern, (linkPatterns.get(pattern) || 0) + 1);
    }
  }

  console.log('リンクパターン別件数:');
  for (const [pattern, count] of Array.from(linkPatterns.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pattern}: ${count} 件`);
  }

  // 4. 空のスラッグチェック
  console.log('\n--- 空スラッグチェック ---');
  let emptySlugCount = 0;
  for (const doc of articlesSnapshot.docs) {
    const data = doc.data();
    if (!data.slug || data.slug.trim() === '') {
      emptySlugCount++;
      console.log(`  ⚠️  空のスラッグ: ${doc.id} - ${data.title}`);
    }
  }
  if (emptySlugCount === 0) {
    console.log('✅ 空のスラッグはありません');
  }

  console.log('\n' + '='.repeat(60));
  console.log('確認完了');
  console.log('='.repeat(60));
}

main().catch(console.error);

