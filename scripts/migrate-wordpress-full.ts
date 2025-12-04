/**
 * WordPress完全移行スクリプト
 * 
 * 機能:
 * 1. WordPress REST APIから記事を取得
 * 2. 画像をダウンロードしてFirebase Storageにアップロード
 * 3. 記事本文内のURL（画像・内部リンク）を置換
 * 4. mediaIdを指定してFirestoreに記事を保存
 * 
 * 使用方法:
 * npx ts-node scripts/migrate-wordpress-full.ts --mediaId=YOUR_MEDIA_ID
 * 
 * オプション:
 * --mediaId    : 必須。移行先のテナントID
 * --dryRun     : 実際に保存せず、プレビューのみ
 * --limit      : 移行する記事数を制限
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import http from 'http';

// WordPress設定
const WORDPRESS_URL = 'https://the-ayumi.jp';
const NEW_SITE_URL = 'https://furatto.pixseo.cloud'; // 新サイトのURL

// Firebase Admin SDK の初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const storage = admin.storage();

// コマンドライン引数の解析
function parseArgs(): { mediaId: string; dryRun: boolean; limit?: number } {
  const args = process.argv.slice(2);
  let mediaId = '';
  let dryRun = false;
  let limit: number | undefined;

  for (const arg of args) {
    if (arg.startsWith('--mediaId=')) {
      mediaId = arg.split('=')[1];
    } else if (arg === '--dryRun') {
      dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    }
  }

  if (!mediaId) {
    console.error('Error: --mediaId is required');
    console.log('Usage: npx ts-node scripts/migrate-wordpress-full.ts --mediaId=YOUR_MEDIA_ID');
    process.exit(1);
  }

  return { mediaId, dryRun, limit };
}

// WordPress REST API インターフェース
interface WPPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  slug: string;
  author: number;
  categories: number[];
  tags: number[];
  featured_media: number;
  date: string;
  status: string;
  yoast_head_json?: {
    og_title?: string;
    og_description?: string;
  };
}

interface WPCategory {
  id: number;
  name: string;
  slug: string;
}

interface WPTag {
  id: number;
  name: string;
  slug: string;
}

interface WPMedia {
  id: number;
  source_url: string;
}

interface WPUser {
  id: number;
  name: string;
}

/**
 * WordPress REST APIからデータを取得
 */
async function fetchFromWordPress<T>(endpoint: string, page: number = 1, perPage: number = 100): Promise<T[]> {
  const url = `${WORDPRESS_URL}/wp-json/wp/v2/${endpoint}?per_page=${perPage}&page=${page}`;
  console.log(`  Fetching: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 400 && page > 1) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json() as T[];
  } catch (error) {
    console.error(`  Error fetching ${endpoint}:`, error);
    return [];
  }
}

/**
 * 全ページのデータを取得
 */
async function fetchAllPages<T>(endpoint: string, limit?: number): Promise<T[]> {
  const allData: T[] = [];
  let page = 1;
  
  while (true) {
    const data = await fetchFromWordPress<T>(endpoint, page);
    
    if (data.length === 0) {
      break;
    }
    
    allData.push(...data);
    console.log(`  Fetched ${allData.length} items from ${endpoint}`);
    
    if (limit && allData.length >= limit) {
      return allData.slice(0, limit);
    }
    
    page++;
    
    if (page > 50) {
      console.warn(`  Reached maximum page limit (50) for ${endpoint}`);
      break;
    }
  }
  
  return allData;
}

/**
 * 画像をダウンロード
 */
async function downloadImage(imageUrl: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const protocol = imageUrl.startsWith('https') ? https : http;
    
    protocol.get(imageUrl, (response) => {
      // リダイレクト対応
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        console.error(`    Failed to download: ${imageUrl} (${response.statusCode})`);
        resolve(null);
        return;
      }
      
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', (err) => {
        console.error(`    Download error: ${err.message}`);
        resolve(null);
      });
    }).on('error', (err) => {
      console.error(`    Request error: ${err.message}`);
      resolve(null);
    });
  });
}

/**
 * Firebase Storageに画像をアップロード
 */
async function uploadToStorage(
  buffer: Buffer,
  originalUrl: string,
  mediaId: string
): Promise<string | null> {
  try {
    const bucket = storage.bucket();
    
    // URLからファイル名を抽出
    const urlPath = new URL(originalUrl).pathname;
    const fileName = path.basename(urlPath);
    const extension = path.extname(fileName).toLowerCase();
    
    // Content-Typeを決定
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const contentType = contentTypes[extension] || 'application/octet-stream';
    
    // 保存パス: media/{mediaId}/wp-migrate/{filename}
    const storagePath = `media/${mediaId}/wp-migrate/${Date.now()}-${fileName}`;
    const file = bucket.file(storagePath);
    
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          originalUrl,
          migratedAt: new Date().toISOString(),
        },
      },
    });
    
    // 公開URLを取得
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    
    return publicUrl;
  } catch (error) {
    console.error(`    Upload error: ${error}`);
    return null;
  }
}

/**
 * 記事本文内の画像URLを置換
 */
async function replaceImageUrls(
  content: string,
  mediaId: string,
  dryRun: boolean
): Promise<{ content: string; imageMap: Map<string, string> }> {
  const imageMap = new Map<string, string>();
  
  // WordPress画像URLのパターン
  const wpImagePattern = /https?:\/\/the-ayumi\.jp\/wp-content\/uploads\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
  
  const matches = content.match(wpImagePattern) || [];
  const uniqueUrls = [...new Set(matches)];
  
  console.log(`    Found ${uniqueUrls.length} unique image URLs`);
  
  for (const originalUrl of uniqueUrls) {
    if (imageMap.has(originalUrl)) continue;
    
    if (dryRun) {
      // ドライランではプレースホルダーURLを使用
      imageMap.set(originalUrl, `[NEW_URL:${path.basename(originalUrl)}]`);
      continue;
    }
    
    console.log(`    Downloading: ${originalUrl}`);
    const buffer = await downloadImage(originalUrl);
    
    if (buffer) {
      const newUrl = await uploadToStorage(buffer, originalUrl, mediaId);
      if (newUrl) {
        imageMap.set(originalUrl, newUrl);
        console.log(`    Uploaded: ${newUrl}`);
      }
    }
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 画像URLを置換
  let newContent = content;
  for (const [oldUrl, newUrl] of imageMap) {
    newContent = newContent.split(oldUrl).join(newUrl);
  }
  
  return { content: newContent, imageMap };
}

/**
 * 内部リンクを新しいURL形式に変換
 */
function replaceInternalLinks(content: string): string {
  let newContent = content;
  
  // 記事リンク: https://the-ayumi.jp/YYYY/MM/DD/slug/ → /articles/slug
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/\d{4}\/\d{2}\/\d{2}\/([^/"<>\s]+)\/?/g,
    '/articles/$1'
  );
  
  // カテゴリーリンク: https://the-ayumi.jp/category/slug/ → /categories/slug
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/category\/([^/"<>\s]+)\/?/g,
    '/categories/$1'
  );
  
  // 著者リンク（削除または置換）
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/author\/([^/"<>\s]+)\/?/g,
    '/writers/$1'
  );
  
  // 固定ページリンク
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/contact\/?/g,
    '/contact'
  );
  
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/media\/?/g,
    '/'
  );
  
  // サイトトップへのリンク
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/?(?=["'<>\s]|$)/g,
    '/'
  );
  
  return newContent;
}

/**
 * HTMLタグを除去してプレーンテキストに
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * カテゴリーを作成または取得
 */
async function getOrCreateCategory(name: string, mediaId: string): Promise<string> {
  const slug = name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]+/g, '');
  
  const categoriesRef = db.collection('categories');
  const querySnapshot = await categoriesRef
    .where('slug', '==', slug)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id;
  }
  
  const docRef = await categoriesRef.add({
    name,
    slug,
    description: '',
    isRecommended: false,
    order: 0,
    mediaId,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });
  
  console.log(`    Created category: ${name} (${docRef.id})`);
  return docRef.id;
}

/**
 * タグを作成または取得
 */
async function getOrCreateTag(name: string, mediaId: string): Promise<string> {
  const slug = name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]+/g, '');
  
  const tagsRef = db.collection('tags');
  const querySnapshot = await tagsRef
    .where('slug', '==', slug)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id;
  }
  
  const docRef = await tagsRef.add({
    name,
    slug,
    searchCount: 0,
    mediaId,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });
  
  console.log(`    Created tag: ${name} (${docRef.id})`);
  return docRef.id;
}

/**
 * 記事を移行
 */
async function migrateArticle(
  post: WPPost,
  categoryMap: Map<number, string>,
  tagMap: Map<number, string>,
  userMap: Map<number, string>,
  mediaMap: Map<number, string>,
  mediaId: string,
  dryRun: boolean
): Promise<void> {
  console.log(`\n  Processing: ${post.title.rendered}`);
  
  // 既存記事チェック
  const articlesRef = db.collection('articles');
  const existingArticles = await articlesRef
    .where('slug', '==', post.slug)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!existingArticles.empty) {
    console.log(`    Skipped (already exists): ${post.slug}`);
    return;
  }
  
  // カテゴリーIDを取得/作成
  const categoryIds: string[] = [];
  for (const catId of post.categories) {
    const catName = categoryMap.get(catId);
    if (catName) {
      const firestoreCatId = dryRun ? `[CAT:${catName}]` : await getOrCreateCategory(catName, mediaId);
      categoryIds.push(firestoreCatId);
    }
  }
  
  // タグIDを取得/作成
  const tagIds: string[] = [];
  for (const tagId of post.tags) {
    const tagName = tagMap.get(tagId);
    if (tagName) {
      const firestoreTagId = dryRun ? `[TAG:${tagName}]` : await getOrCreateTag(tagName, mediaId);
      tagIds.push(firestoreTagId);
    }
  }
  
  // コンテンツ内の画像URLを置換
  const { content: processedContent, imageMap } = await replaceImageUrls(
    post.content.rendered,
    mediaId,
    dryRun
  );
  
  // 内部リンクを置換
  const finalContent = replaceInternalLinks(processedContent);
  
  // アイキャッチ画像
  let featuredImage = mediaMap.get(post.featured_media) || '';
  if (featuredImage && !dryRun) {
    const buffer = await downloadImage(featuredImage);
    if (buffer) {
      const newUrl = await uploadToStorage(buffer, featuredImage, mediaId);
      if (newUrl) {
        featuredImage = newUrl;
      }
    }
  }
  
  const articleData = {
    title: stripHtml(post.title.rendered),
    content: finalContent,
    excerpt: stripHtml(post.excerpt.rendered),
    slug: post.slug,
    publishedAt: admin.firestore.Timestamp.fromDate(new Date(post.date)),
    updatedAt: admin.firestore.Timestamp.now(),
    authorId: 'wordpress-migration',
    authorName: userMap.get(post.author) || 'Unknown',
    categoryIds,
    tagIds,
    featuredImage,
    isPublished: post.status === 'publish',
    viewCount: 0,
    likeCount: 0,
    mediaId,
    metaTitle: post.yoast_head_json?.og_title || stripHtml(post.title.rendered),
    metaDescription: post.yoast_head_json?.og_description || stripHtml(post.excerpt.rendered),
  };
  
  if (dryRun) {
    console.log(`    [DRY RUN] Would create article:`);
    console.log(`      Title: ${articleData.title}`);
    console.log(`      Slug: ${articleData.slug}`);
    console.log(`      Categories: ${categoryIds.length}`);
    console.log(`      Tags: ${tagIds.length}`);
    console.log(`      Images replaced: ${imageMap.size}`);
  } else {
    await articlesRef.add(articleData);
    console.log(`    ✅ Migrated: ${articleData.title}`);
  }
}

/**
 * メイン処理
 */
async function main() {
  const { mediaId, dryRun, limit } = parseArgs();
  
  console.log('='.repeat(60));
  console.log('WordPress完全移行スクリプト');
  console.log('='.repeat(60));
  console.log(`\nTarget mediaId: ${mediaId}`);
  console.log(`Dry run: ${dryRun}`);
  if (limit) console.log(`Limit: ${limit} articles`);
  console.log('');
  
  // mediaIdの存在確認
  const tenantDoc = await db.collection('mediaTenants').doc(mediaId).get();
  if (!tenantDoc.exists) {
    console.error(`Error: mediaTenant "${mediaId}" not found`);
    console.log('\nAvailable mediaTenants:');
    const tenants = await db.collection('mediaTenants').get();
    tenants.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.name} (slug: ${data.slug})`);
    });
    process.exit(1);
  }
  
  console.log(`✅ Found tenant: ${tenantDoc.data()?.name}\n`);
  
  try {
    // カテゴリーを取得
    console.log('📁 Fetching categories...');
    const categories = await fetchAllPages<WPCategory>('categories');
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
    console.log(`  Found ${categories.length} categories\n`);
    
    // タグを取得
    console.log('🏷️  Fetching tags...');
    const tags = await fetchAllPages<WPTag>('tags');
    const tagMap = new Map(tags.map(tag => [tag.id, tag.name]));
    console.log(`  Found ${tags.length} tags\n`);
    
    // ユーザー（著者）を取得
    console.log('👤 Fetching users...');
    const users = await fetchAllPages<WPUser>('users');
    const userMap = new Map(users.map(user => [user.id, user.name]));
    console.log(`  Found ${users.length} users\n`);
    
    // 記事を取得
    console.log('📝 Fetching posts...');
    const posts = await fetchAllPages<WPPost>('posts', limit);
    console.log(`  Found ${posts.length} posts\n`);
    
    // アイキャッチ画像URLを取得
    console.log('🖼️  Fetching featured images...');
    const mediaIds = [...new Set(posts.map(post => post.featured_media).filter(id => id > 0))];
    const mediaMap = new Map<number, string>();
    
    for (const mid of mediaIds) {
      try {
        const mediaData = await fetchFromWordPress<WPMedia>(`media/${mid}`, 1, 1);
        if (mediaData.length > 0) {
          mediaMap.set(mid, mediaData[0].source_url);
        }
      } catch (error) {
        console.error(`  Error fetching media ${mid}:`, error);
      }
    }
    console.log(`  Found ${mediaMap.size} featured images\n`);
    
    // 記事を移行
    console.log('🚀 Starting migration...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const post of posts) {
      try {
        await migrateArticle(post, categoryMap, tagMap, userMap, mediaMap, mediaId, dryRun);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error migrating "${post.title.rendered}":`, error);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Migration completed!');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No data was actually saved.');
      console.log('Run without --dryRun to perform the actual migration.');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

