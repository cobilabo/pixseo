/**
 * 内部リンクの詳細を確認するスクリプト
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
  console.log('内部リンク詳細確認スクリプト');
  console.log('='.repeat(60));

  // 記事を取得
  const articlesSnapshot = await db.collection('articles')
    .where('mediaId', '==', MEDIA_ID)
    .get();

  console.log(`\n📝 Total articles: ${articlesSnapshot.docs.length}\n`);

  // /[other] パターンのリンクを収集
  const otherLinks = new Map<string, { count: number; articles: string[] }>();
  
  for (const doc of articlesSnapshot.docs) {
    const data = doc.data();
    const content = data.content || '';
    const title = data.title || '';
    
    // href属性を抽出
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRegex.exec(content)) !== null) {
      const href = hrefMatch[1];
      
      // /で始まるが、/article/, /category/, /tag/, /writer/ 以外のもの
      if (href.startsWith('/') && 
          !href.startsWith('/article/') && 
          !href.startsWith('/category/') && 
          !href.startsWith('/tag/') && 
          !href.startsWith('/writer/') &&
          !href.startsWith('#')) {
        
        if (!otherLinks.has(href)) {
          otherLinks.set(href, { count: 0, articles: [] });
        }
        const entry = otherLinks.get(href)!;
        entry.count++;
        if (!entry.articles.includes(title)) {
          entry.articles.push(title);
        }
      }
    }
  }

  // 結果を表示
  console.log('--- /[other] パターンの内部リンク一覧 ---\n');
  
  // カウント順にソート
  const sortedLinks = Array.from(otherLinks.entries())
    .sort((a, b) => b[1].count - a[1].count);

  // パターン別に分類
  const patterns: { [key: string]: { links: string[]; count: number } } = {};
  
  for (const [link, data] of sortedLinks) {
    // パターンを判定
    let pattern = 'その他';
    
    if (/^\/\d{4}\/\d{2}\/\d{2}\//.test(link)) {
      pattern = 'WP日付パーマリンク (/YYYY/MM/DD/slug/)';
    } else if (/^\/[a-z0-9-]+\/$/.test(link)) {
      pattern = 'ルートページ (/slug/)';
    } else if (link.includes('wp-content')) {
      pattern = 'WPコンテンツ';
    } else if (/^\/page\/\d+/.test(link)) {
      pattern = 'ページネーション';
    }
    
    if (!patterns[pattern]) {
      patterns[pattern] = { links: [], count: 0 };
    }
    patterns[pattern].links.push(link);
    patterns[pattern].count += data.count;
  }

  // パターン別サマリー
  console.log('📊 パターン別サマリー:');
  for (const [pattern, data] of Object.entries(patterns).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`\n  ${pattern}: ${data.count} 件 (${data.links.length} 種類)`);
  }

  // 詳細表示
  console.log('\n\n--- 詳細一覧 ---');
  
  for (const [pattern, data] of Object.entries(patterns).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`\n\n### ${pattern} ###`);
    
    // 各パターンのリンクを表示（最大20件）
    const linksToShow = data.links.slice(0, 20);
    for (const link of linksToShow) {
      const linkData = otherLinks.get(link)!;
      console.log(`\n  リンク: ${link}`);
      console.log(`  使用回数: ${linkData.count}`);
      console.log(`  使用記事: ${linkData.articles.slice(0, 3).join(', ')}${linkData.articles.length > 3 ? '...' : ''}`);
    }
    
    if (data.links.length > 20) {
      console.log(`\n  ... 他 ${data.links.length - 20} 件`);
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('確認完了');
  console.log('='.repeat(60));
}

main().catch(console.error);

