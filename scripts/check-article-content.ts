/**
 * 特定記事のコンテンツを確認するスクリプト
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
const ARTICLE_SLUG = process.argv[2] || 'barrier-free_hotel_japanese-inn_30';

async function main() {
  console.log('='.repeat(60));
  console.log(`記事コンテンツ確認: ${ARTICLE_SLUG}`);
  console.log('='.repeat(60));

  // 記事を取得
  const articlesSnapshot = await db.collection('articles')
    .where('mediaId', '==', MEDIA_ID)
    .where('slug', '==', ARTICLE_SLUG)
    .limit(1)
    .get();

  if (articlesSnapshot.empty) {
    console.log('記事が見つかりませんでした。');
    return;
  }

  const doc = articlesSnapshot.docs[0];
  const data = doc.data();
  const content = data.content || '';

  console.log(`\nタイトル: ${data.title}`);
  console.log(`スラッグ: ${data.slug}`);
  console.log(`コンテンツ長: ${content.length} 文字\n`);

  // 問題のあるstyle属性を検索
  console.log('--- 問題のあるスタイル属性を検索 ---\n');

  // style="..." の中身を抽出
  const styleRegex = /style=["']([^"']+)["']/gi;
  let match;
  const problematicStyles: string[] = [];

  while ((match = styleRegex.exec(content)) !== null) {
    const styleValue = match[1];
    
    // 数字で始まるプロパティ（例: "0: value"）や不正な形式をチェック
    if (/^\d+:/.test(styleValue) || /;\s*\d+:/.test(styleValue)) {
      problematicStyles.push(match[0]);
    }
    
    // インデックスベースのスタイル（例: style="0"）
    if (/^[\d\s]+$/.test(styleValue.trim())) {
      problematicStyles.push(match[0]);
    }
  }

  if (problematicStyles.length > 0) {
    console.log(`⚠️  問題のあるスタイル属性: ${problematicStyles.length} 件`);
    for (const style of problematicStyles) {
      console.log(`  ${style}`);
    }
  } else {
    console.log('✅ 明らかに問題のあるスタイル属性は見つかりませんでした');
  }

  // すべてのstyle属性を表示
  console.log('\n--- すべてのstyle属性 ---\n');
  const allStyles: string[] = [];
  const styleRegex2 = /style=["']([^"']+)["']/gi;
  while ((match = styleRegex2.exec(content)) !== null) {
    allStyles.push(match[0]);
  }

  if (allStyles.length === 0) {
    console.log('style属性は見つかりませんでした');
  } else {
    console.log(`style属性: ${allStyles.length} 件`);
    for (const style of allStyles.slice(0, 30)) {
      console.log(`  ${style}`);
    }
    if (allStyles.length > 30) {
      console.log(`  ... 他 ${allStyles.length - 30} 件`);
    }
  }

  // data-*属性を確認
  console.log('\n--- data-*属性 ---\n');
  const dataAttrRegex = /data-[a-z-]+=["'][^"']*["']/gi;
  const dataAttrs: string[] = [];
  while ((match = dataAttrRegex.exec(content)) !== null) {
    dataAttrs.push(match[0]);
  }

  if (dataAttrs.length === 0) {
    console.log('data-*属性は見つかりませんでした');
  } else {
    console.log(`data-*属性: ${dataAttrs.length} 件`);
    // ユニークなものだけ表示
    const uniqueDataAttrs = [...new Set(dataAttrs)].slice(0, 20);
    for (const attr of uniqueDataAttrs) {
      console.log(`  ${attr}`);
    }
  }

  // コンテンツの最初の部分を表示
  console.log('\n--- コンテンツの最初の2000文字 ---\n');
  console.log(content.substring(0, 2000));

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);

