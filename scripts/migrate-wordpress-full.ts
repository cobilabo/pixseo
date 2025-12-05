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

import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import http from 'http';
import sharp from 'sharp';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// WordPress設定
const WORDPRESS_URL = 'https://the-ayumi.jp';
const NEW_SITE_URL = 'https://furatto.pixseo.cloud'; // 新サイトのURL

// WordPress認証情報（環境変数から取得）
const WP_USERNAME = process.env.WP_USERNAME || '';
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || '';
const WP_AUTH_HEADER = WP_USERNAME && WP_APP_PASSWORD 
  ? `Basic ${Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64')}`
  : '';

// Firebase Admin SDK の初期化
if (!admin.apps.length) {
  // サービスアカウントファイルを直接読み込む
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
function parseArgs(): { mediaId: string; dryRun: boolean; limit?: number; includePages: boolean } {
  const args = process.argv.slice(2);
  let mediaId = '';
  let dryRun = false;
  let limit: number | undefined;
  let includePages = false;

  for (const arg of args) {
    if (arg.startsWith('--mediaId=')) {
      mediaId = arg.split('=')[1];
    } else if (arg === '--dryRun') {
      dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--includePages') {
      includePages = true;
    }
  }

  if (!mediaId) {
    console.error('Error: --mediaId is required');
    console.log('Usage: npx tsx scripts/migrate-wordpress-full.ts --mediaId=YOUR_MEDIA_ID [--dryRun] [--limit=N] [--includePages]');
    process.exit(1);
  }

  return { mediaId, dryRun, limit, includePages };
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

interface WPPage {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  slug: string;
  parent: number;
  featured_media: number;
  date: string;
  status: string;
  menu_order: number;
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
  slug: string;
  description?: string;
  avatar_urls?: {
    '24'?: string;
    '48'?: string;
    '96'?: string;
  };
}

/**
 * WordPress REST APIからデータを取得（リスト形式）
 */
async function fetchFromWordPress<T>(endpoint: string, page: number = 1, perPage: number = 100, includeAllStatus: boolean = false): Promise<T[]> {
  // 認証がある場合は全ステータスを取得可能
  const statusParam = (includeAllStatus && WP_AUTH_HEADER) ? '&status=publish,draft,private,pending' : '';
  const url = `${WORDPRESS_URL}/wp-json/wp/v2/${endpoint}?per_page=${perPage}&page=${page}${statusParam}`;
  console.log(`  Fetching: ${url}`);
  
  try {
    const headers: Record<string, string> = {};
    if (WP_AUTH_HEADER) {
      headers['Authorization'] = WP_AUTH_HEADER;
    }
    
    const response = await fetch(url, { headers });
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
 * WordPress REST APIから単一リソースを取得
 */
async function fetchSingleFromWordPress<T>(endpoint: string): Promise<T | null> {
  const url = `${WORDPRESS_URL}/wp-json/wp/v2/${endpoint}`;
  
  try {
    const headers: Record<string, string> = {};
    if (WP_AUTH_HEADER) {
      headers['Authorization'] = WP_AUTH_HEADER;
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return null;
    }
    
    return await response.json() as T;
  } catch (error) {
    return null;
  }
}

/**
 * 全ページのデータを取得
 */
async function fetchAllPages<T>(endpoint: string, limit?: number, includeAllStatus: boolean = false): Promise<T[]> {
  const allData: T[] = [];
  let page = 1;
  
  while (true) {
    const data = await fetchFromWordPress<T>(endpoint, page, 100, includeAllStatus);
    
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
 * 公開URLを取得
 */
async function getSignedUrl(file: admin.storage.File): Promise<string> {
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-09-2491',
  });
  return url;
}

/**
 * Firebase Storageに画像をアップロード（管理画面と同じ仕様）
 * - メイン画像: 最大幅2000px、WebP(品質80%)
 * - サムネイル: 300x300、fit:cover、WebP(品質70%)
 * - mediaLibraryコレクションにメタデータを保存
 */
async function uploadToStorage(
  buffer: Buffer,
  originalUrl: string,
  mediaId: string,
  dryRun: boolean = false
): Promise<{ mainUrl: string; thumbnailUrl: string } | null> {
  try {
    const bucket = storage.bucket();
    const timestamp = Date.now();
    
    // URLからファイル名を抽出
    const urlPath = new URL(originalUrl).pathname;
    const originalFileName = decodeURIComponent(path.basename(urlPath));
    const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // 画像情報を取得
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;
    
    // 最大幅2000pxにリサイズ（アスペクト比維持）
    const maxWidth = 2000;
    const resizedImage = originalWidth > maxWidth
      ? image.resize(maxWidth, null, { withoutEnlargement: true })
      : image;
    
    // WebP形式に変換（品質80%）
    const optimizedBuffer = await resizedImage
      .webp({ quality: 80 })
      .toBuffer();
    
    const finalSize = optimizedBuffer.length;
    
    // 最適化後のサイズを取得
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();
    const finalWidth = optimizedMetadata.width || originalWidth;
    const finalHeight = optimizedMetadata.height || originalHeight;
    
    console.log(`      Optimized: ${buffer.length} → ${finalSize} (${((1 - finalSize / buffer.length) * 100).toFixed(1)}% reduction)`);
    
    // メイン画像をアップロード
    const mainPath = `media/images/${timestamp}_${sanitizedName.replace(/\.[^.]+$/, '.webp')}`;
    const mainFile = bucket.file(mainPath);
    await mainFile.save(optimizedBuffer, {
      metadata: { contentType: 'image/webp' },
    });
    const mainUrl = await getSignedUrl(mainFile);
    
    // サムネイル生成（300x300）
    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer();
    
    const thumbnailPath = `media/thumbnails/${timestamp}_${sanitizedName.replace(/\.[^.]+$/, '.webp')}`;
    const thumbnailFile = bucket.file(thumbnailPath);
    await thumbnailFile.save(thumbnailBuffer, {
      metadata: { contentType: 'image/webp' },
    });
    const thumbnailUrl = await getSignedUrl(thumbnailFile);
    
    // Firestoreの mediaLibrary コレクションにメタデータを保存
    if (!dryRun) {
      const mediaData = {
        mediaId,
        name: `${timestamp}_${sanitizedName.replace(/\.[^.]+$/, '.webp')}`,
        originalName: originalFileName,
        url: mainUrl,
        thumbnailUrl,
        type: 'image' as const,
        mimeType: 'image/webp',
        size: finalSize,
        width: finalWidth,
        height: finalHeight,
        alt: originalFileName.replace(/\.[^.]+$/, ''),
        usageContext: 'wp-migration',
        wpOriginalUrl: originalUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        wpMigrated: true,
        wpMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await db.collection('mediaLibrary').add(mediaData);
    }
    
    return { mainUrl, thumbnailUrl };
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
): Promise<{ content: string; imageMap: Map<string, string>; imageCount: number }> {
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
      const result = await uploadToStorage(buffer, originalUrl, mediaId, dryRun);
      if (result) {
        imageMap.set(originalUrl, result.mainUrl);
        console.log(`      ✅ Uploaded with thumbnail`);
      }
    }
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // 画像URLを置換
  let newContent = content;
  for (const [oldUrl, newUrl] of imageMap) {
    newContent = newContent.split(oldUrl).join(newUrl);
  }
  
  return { content: newContent, imageMap, imageCount: imageMap.size };
}

// 固定ページのスラッグセット（動的に設定される）
let pageSlugSet = new Set<string>();

/**
 * 固定ページのスラッグセットを設定
 */
function setPageSlugs(slugs: string[]): void {
  pageSlugSet = new Set(slugs);
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
  
  // タグリンク: https://the-ayumi.jp/tag/slug/ → /tags/slug
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/tag\/([^/"<>\s]+)\/?/g,
    '/tags/$1'
  );
  
  // 著者リンク: https://the-ayumi.jp/author/slug/ → /writers/slug
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/author\/([^/"<>\s]+)\/?/g,
    '/writers/$1'
  );
  
  // 固定ページリンク（動的）: https://the-ayumi.jp/slug/ → /slug
  // 既知の固定ページスラッグに対して変換
  for (const slug of pageSlugSet) {
    const pattern = new RegExp(`https?:\\/\\/the-ayumi\\.jp\\/${slug}\\/?(?=["'<>\\s]|#|$)`, 'gi');
    newContent = newContent.replace(pattern, `/${slug}`);
  }
  
  // 一般的な固定ページパターン（日付なし、単一スラッグ）
  // ※記事・カテゴリー・タグ・著者以外のルートレベルURL
  // 注意: これは最後に適用し、慎重に処理
  newContent = newContent.replace(
    /https?:\/\/the-ayumi\.jp\/([a-z0-9-]+)\/?(?=["'<>\s]|#|$)/gi,
    (match, slug) => {
      // 既に変換済みのパターンはスキップ
      if (['category', 'tag', 'author', 'wp-content', 'wp-admin', 'wp-includes', 'feed'].includes(slug)) {
        return match;
      }
      // 固定ページとして変換
      return `/${slug}`;
    }
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
 * コンテンツから最初の画像URLを抽出
 */
function extractFirstImageUrl(content: string): string | null {
  // imgタグのsrc属性を抽出
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return null;
}

/**
 * カテゴリーを作成または取得
 */
/**
 * 日本語から英語への変換マップ（よく使われるカテゴリー/タグ名）
 */
const japaneseToEnglishMap: Record<string, string> = {
  // カテゴリー
  'お知らせ': 'notification',
  'ニュース': 'news',
  '旅行': 'travel',
  '観光': 'sightseeing',
  '旅行/観光': 'travel-sightseeing',
  'グルメ': 'gourmet',
  '食事': 'dining',
  'イベント': 'event',
  'インタビュー': 'interview',
  'コラム': 'column',
  'レビュー': 'review',
  '製品': 'product',
  'サービス': 'service',
  '健康': 'health',
  '医療': 'medical',
  '福祉': 'welfare',
  '介護': 'care',
  '就労': 'employment',
  '仕事': 'work',
  '生活': 'lifestyle',
  '暮らし': 'living',
  'ファッション': 'fashion',
  '美容': 'beauty',
  'テクノロジー': 'technology',
  'アプリ': 'app',
  'ツール': 'tool',
  '便利グッズ': 'useful-goods',
  '交通': 'transportation',
  '移動': 'mobility',
  'バリアフリー': 'barrier-free',
  'ユニバーサルデザイン': 'universal-design',
  '車椅子': 'wheelchair',
  '障害': 'disability',
  '障がい': 'disability',
  'アクセシビリティ': 'accessibility',
  // タグ
  'アクティビティ': 'activity',
  'テーマパーク': 'theme-park',
  'ホテル': 'hotel',
  '宿泊': 'accommodation',
  '飲食店': 'restaurant',
  'カフェ': 'cafe',
  'ショッピング': 'shopping',
  '買い物': 'shopping',
  '公共施設': 'public-facility',
  '公園': 'park',
  '美術館': 'museum',
  '映画館': 'cinema',
  'スポーツ': 'sports',
  'エンタメ': 'entertainment',
  '娯楽': 'entertainment',
  '教育': 'education',
  '学校': 'school',
  '病院': 'hospital',
  '駅': 'station',
  '空港': 'airport',
  '電車': 'train',
  'バス': 'bus',
  'タクシー': 'taxi',
  'レンタカー': 'rental-car',
  '補助具': 'assistive-device',
  '補聴器': 'hearing-aid',
  '点字': 'braille',
  '手話': 'sign-language',
  '情報': 'information',
  'ガイド': 'guide',
  'マップ': 'map',
  '地図': 'map',
  'おすすめ': 'recommended',
  '人気': 'popular',
  '最新': 'latest',
  '特集': 'feature',
  'まとめ': 'summary',
  '解説': 'explanation',
  '入門': 'beginner',
  '基礎': 'basics',
  '応用': 'advanced',
  '体験': 'experience',
  '実践': 'practice',
};

/**
 * スラッグを英数字とハイフンのみに変換
 */
function sanitizeSlug(slug: string, name?: string): string {
  // 既に英数字とハイフンのみなら変換不要
  if (/^[a-z0-9-]+$/.test(slug)) {
    return slug;
  }
  
  // 名前から日本語→英語の変換を試みる
  if (name && japaneseToEnglishMap[name]) {
    return japaneseToEnglishMap[name];
  }
  
  // URLデコードを試みる（%XX形式の場合）
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug.replace(/-/g, '%'));
  } catch {
    // デコード失敗時はそのまま
  }
  
  // デコード後の名前で変換を試みる
  if (japaneseToEnglishMap[decoded]) {
    return japaneseToEnglishMap[decoded];
  }
  
  // 日本語や特殊文字を含む場合、英数字とハイフン以外を削除
  let sanitized = slug.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')  // 英数字とハイフン以外をハイフンに
    .replace(/-+/g, '-')          // 連続するハイフンを1つに
    .replace(/^-|-$/g, '');       // 先頭と末尾のハイフンを削除
  
  // 空または短すぎる場合は名前ベースのIDを生成
  if (!sanitized || sanitized.length < 3) {
    // 名前のハッシュから短いIDを生成
    const hash = name ? 
      Buffer.from(name).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toLowerCase() :
      Date.now().toString(36);
    sanitized = `item-${hash}`;
  }
  
  return sanitized;
}

async function getOrCreateCategory(name: string, wpSlug: string, mediaId: string): Promise<string> {
  const slug = sanitizeSlug(wpSlug, name);
  
  const categoriesRef = db.collection('categories');
  
  // 名前で既存データをチェック（優先）
  const nameQuerySnapshot = await categoriesRef
    .where('name', '==', name)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!nameQuerySnapshot.empty) {
    console.log(`    Using existing category (by name): ${name}`);
    return nameQuerySnapshot.docs[0].id;
  }
  
  // スラッグでも既存データをチェック
  const slugQuerySnapshot = await categoriesRef
    .where('slug', '==', slug)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!slugQuerySnapshot.empty) {
    console.log(`    Using existing category (by slug): ${slug}`);
    return slugQuerySnapshot.docs[0].id;
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
    wpMigrated: true,
    wpMigratedAt: admin.firestore.Timestamp.now(),
  });
  
  console.log(`    Created category: ${name} (slug: ${slug}, id: ${docRef.id})`);
  return docRef.id;
}

/**
 * タグを作成または取得
 */
async function getOrCreateTag(name: string, wpSlug: string, mediaId: string): Promise<string> {
  const slug = sanitizeSlug(wpSlug, name);
  
  const tagsRef = db.collection('tags');
  
  // 名前で既存データをチェック（優先）
  const nameQuerySnapshot = await tagsRef
    .where('name', '==', name)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!nameQuerySnapshot.empty) {
    console.log(`    Using existing tag (by name): ${name}`);
    return nameQuerySnapshot.docs[0].id;
  }
  
  // スラッグでも既存データをチェック
  const slugQuerySnapshot = await tagsRef
    .where('slug', '==', slug)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!slugQuerySnapshot.empty) {
    console.log(`    Using existing tag (by slug): ${slug}`);
    return slugQuerySnapshot.docs[0].id;
  }
  
  const docRef = await tagsRef.add({
    name,
    slug,
    searchCount: 0,
    mediaId,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    wpMigrated: true,
    wpMigratedAt: admin.firestore.Timestamp.now(),
  });
  
  console.log(`    Created tag: ${name} (slug: ${slug}, id: ${docRef.id})`);
  return docRef.id;
}

/**
 * ライターを作成または取得
 */
async function getOrCreateWriter(
  wpUser: WPUser,
  mediaId: string
): Promise<{ writerId: string; writerName: string }> {
  const writersRef = db.collection('writers');
  
  // 名前でライターを検索
  const querySnapshot = await writersRef
    .where('handleName', '==', wpUser.name)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { writerId: doc.id, writerName: wpUser.name };
  }
  
  // 新規ライターを作成
  const writerData: Record<string, unknown> = {
    handleName: wpUser.name,
    handleName_ja: wpUser.name,
    bio: wpUser.description || '',
    bio_ja: wpUser.description || '',
    mediaId,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    wpMigrated: true,
    wpMigratedAt: admin.firestore.Timestamp.now(),
    wpOriginalId: wpUser.id,
  };
  
  // アバター画像がある場合は設定（外部URL）
  if (wpUser.avatar_urls?.['96']) {
    writerData.icon = wpUser.avatar_urls['96'];
  }
  
  const docRef = await writersRef.add(writerData);
  console.log(`    ✅ Created writer: ${wpUser.name} (${docRef.id})`);
  
  return { writerId: docRef.id, writerName: wpUser.name };
}

// ライターキャッシュ（同じユーザーの重複登録を防ぐ）
const writerCache = new Map<number, { writerId: string; writerName: string }>();

/**
 * 記事を移行
 */
async function migrateArticle(
  post: WPPost,
  categoryMap: Map<number, string>,
  tagMap: Map<number, string>,
  userMap: Map<number, WPUser>,
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
    const catInfo = categoryMap.get(catId);
    if (catInfo) {
      const firestoreCatId = dryRun ? `[CAT:${catInfo.name}]` : await getOrCreateCategory(catInfo.name, catInfo.slug, mediaId);
      categoryIds.push(firestoreCatId);
    }
  }
  
  // タグIDを取得/作成
  const tagIds: string[] = [];
  for (const tagId of post.tags) {
    const tagInfo = tagMap.get(tagId);
    if (tagInfo) {
      const firestoreTagId = dryRun ? `[TAG:${tagInfo.name}]` : await getOrCreateTag(tagInfo.name, tagInfo.slug, mediaId);
      tagIds.push(firestoreTagId);
    }
  }
  
  // ライターを取得/作成
  let writerId = '';
  const wpUser = userMap.get(post.author);
  if (wpUser) {
    if (dryRun) {
      writerId = `[WRITER:${wpUser.name}]`;
    } else {
      // キャッシュをチェック
      if (writerCache.has(post.author)) {
        const cached = writerCache.get(post.author)!;
        writerId = cached.writerId;
      } else {
        const writerResult = await getOrCreateWriter(wpUser, mediaId);
        writerId = writerResult.writerId;
        writerCache.set(post.author, writerResult);
      }
    }
  }
  
  // コンテンツ内の画像URLを置換
  const { content: processedContent, imageCount } = await replaceImageUrls(
    post.content.rendered,
    mediaId,
    dryRun
  );
  
  // 内部リンクを置換
  const finalContent = replaceInternalLinks(processedContent);
  
  // アイキャッチ画像
  let featuredImage = mediaMap.get(post.featured_media) || '';
  let featuredImageAlt = '';
  
  // アイキャッチがない場合は記事内の最初の画像を使用
  if (!featuredImage) {
    const firstImageUrl = extractFirstImageUrl(post.content.rendered);
    if (firstImageUrl) {
      featuredImage = firstImageUrl;
      console.log(`    No featured image set, using first image from content`);
    }
  }
  
  if (featuredImage) {
    if (dryRun) {
      featuredImage = `[FEATURED:${path.basename(featuredImage)}]`;
    } else {
      console.log(`    Processing featured image...`);
      const buffer = await downloadImage(featuredImage);
      if (buffer) {
        const result = await uploadToStorage(buffer, featuredImage, mediaId, dryRun);
        if (result) {
          featuredImageAlt = path.basename(featuredImage).replace(/\.[^.]+$/, '');
          featuredImage = result.mainUrl;
          console.log(`      ✅ Featured image uploaded with thumbnail`);
        }
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
    writerId,
    categoryIds,
    tagIds,
    featuredImage,
    featuredImageAlt,
    isPublished: post.status === 'publish',
    viewCount: 0,
    likeCount: 0,
    mediaId,
    metaTitle: post.yoast_head_json?.og_title || stripHtml(post.title.rendered),
    metaDescription: post.yoast_head_json?.og_description || stripHtml(post.excerpt.rendered),
    // 移行識別マーカー（ロールバック用）
    wpMigrated: true,
    wpMigratedAt: admin.firestore.Timestamp.now(),
    wpOriginalId: post.id,
  };
  
  if (dryRun) {
    console.log(`    [DRY RUN] Would create article:`);
    console.log(`      Title: ${articleData.title}`);
    console.log(`      Slug: ${articleData.slug}`);
    console.log(`      Categories: ${categoryIds.length}`);
    console.log(`      Tags: ${tagIds.length}`);
    console.log(`      Images replaced: ${imageCount}`);
  } else {
    await articlesRef.add(articleData);
    console.log(`    ✅ Migrated: ${articleData.title}`);
  }
}

/**
 * 固定ページを移行
 */
async function migratePage(
  wpPage: WPPage,
  mediaMap: Map<number, string>,
  pageSlugToIdMap: Map<string, string>,
  mediaId: string,
  dryRun: boolean
): Promise<string | null> {
  console.log(`\n  Processing page: ${wpPage.title.rendered}`);
  
  // 既存ページチェック
  const pagesRef = db.collection('pages');
  const existingPages = await pagesRef
    .where('slug', '==', wpPage.slug)
    .where('mediaId', '==', mediaId)
    .get();
  
  if (!existingPages.empty) {
    console.log(`    Skipped (already exists): ${wpPage.slug}`);
    pageSlugToIdMap.set(wpPage.slug, existingPages.docs[0].id);
    return existingPages.docs[0].id;
  }
  
  // コンテンツ内の画像URLを置換
  const { content: processedContent, imageCount } = await replaceImageUrls(
    wpPage.content.rendered,
    mediaId,
    dryRun
  );
  
  // 内部リンクを置換
  const finalContent = replaceInternalLinks(processedContent);
  
  // アイキャッチ画像
  let featuredImage = mediaMap.get(wpPage.featured_media) || '';
  let featuredImageAlt = '';
  if (featuredImage) {
    if (dryRun) {
      featuredImage = `[FEATURED:${path.basename(featuredImage)}]`;
    } else {
      console.log(`    Processing featured image...`);
      const buffer = await downloadImage(featuredImage);
      if (buffer) {
        const result = await uploadToStorage(buffer, featuredImage, mediaId, dryRun);
        if (result) {
          featuredImageAlt = path.basename(featuredImage).replace(/\.[^.]+$/, '');
          featuredImage = result.mainUrl;
          console.log(`      ✅ Featured image uploaded with thumbnail`);
        }
      }
    }
  }
  
  const pageData = {
    title: stripHtml(wpPage.title.rendered),
    content: finalContent,
    excerpt: stripHtml(wpPage.excerpt.rendered),
    slug: wpPage.slug,
    publishedAt: admin.firestore.Timestamp.fromDate(new Date(wpPage.date)),
    updatedAt: admin.firestore.Timestamp.now(),
    featuredImage,
    featuredImageAlt,
    isPublished: wpPage.status === 'publish',
    order: wpPage.menu_order || 0,
    mediaId,
    metaTitle: wpPage.yoast_head_json?.og_title || stripHtml(wpPage.title.rendered),
    metaDescription: wpPage.yoast_head_json?.og_description || stripHtml(wpPage.excerpt.rendered),
    useBlockBuilder: false, // HTML形式で移行
    // 移行識別マーカー（ロールバック用）
    wpMigrated: true,
    wpMigratedAt: admin.firestore.Timestamp.now(),
    wpOriginalId: wpPage.id,
  };
  
  if (dryRun) {
    console.log(`    [DRY RUN] Would create page:`);
    console.log(`      Title: ${pageData.title}`);
    console.log(`      Slug: ${pageData.slug}`);
    console.log(`      Images replaced: ${imageCount}`);
    return null;
  } else {
    const docRef = await pagesRef.add(pageData);
    pageSlugToIdMap.set(wpPage.slug, docRef.id);
    console.log(`    ✅ Migrated page: ${pageData.title}`);
    return docRef.id;
  }
}

/**
 * 固定ページの親子関係を更新
 */
async function updatePageParentRelations(
  wpPages: WPPage[],
  pageSlugToIdMap: Map<string, string>,
  mediaId: string,
  dryRun: boolean
): Promise<void> {
  console.log('\n📁 Updating page parent relations...');
  
  // WPのIDからslugへのマップを作成
  const wpIdToSlugMap = new Map<number, string>();
  wpPages.forEach(page => wpIdToSlugMap.set(page.id, page.slug));
  
  for (const wpPage of wpPages) {
    if (wpPage.parent > 0) {
      const parentSlug = wpIdToSlugMap.get(wpPage.parent);
      const childSlug = wpPage.slug;
      
      if (parentSlug) {
        const parentId = pageSlugToIdMap.get(parentSlug);
        const childId = pageSlugToIdMap.get(childSlug);
        
        if (parentId && childId && !dryRun) {
          await db.collection('pages').doc(childId).update({
            parentId: parentId,
          });
          console.log(`  Updated parent: ${childSlug} → ${parentSlug}`);
        } else if (dryRun) {
          console.log(`  [DRY RUN] Would set parent: ${childSlug} → ${parentSlug}`);
        }
      }
    }
  }
}

/**
 * メイン処理
 */
async function main() {
  const { mediaId, dryRun, limit, includePages } = parseArgs();
  
  console.log('='.repeat(60));
  console.log('WordPress完全移行スクリプト');
  console.log('='.repeat(60));
  console.log(`\nTarget mediaId: ${mediaId}`);
  console.log(`Dry run: ${dryRun}`);
  if (limit) console.log(`Limit: ${limit} articles`);
  console.log(`Include pages: ${includePages}`);
  console.log(`WP Auth: ${WP_AUTH_HEADER ? '✅ Authenticated (can fetch draft/private)' : '❌ Not authenticated (public posts only)'}`);
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
    const categoryMap = new Map(categories.map(cat => [cat.id, { name: cat.name, slug: cat.slug }]));
    console.log(`  Found ${categories.length} categories\n`);
    
    // タグを取得
    console.log('🏷️  Fetching tags...');
    const tags = await fetchAllPages<WPTag>('tags');
    const tagMap = new Map(tags.map(tag => [tag.id, { name: tag.name, slug: tag.slug }]));
    console.log(`  Found ${tags.length} tags\n`);
    
    // ユーザー（著者）を取得
    console.log('👤 Fetching users...');
    const users = await fetchAllPages<WPUser>('users');
    const userMap = new Map<number, WPUser>(users.map(user => [user.id, user]));
    console.log(`  Found ${users.length} users\n`);
    
    // ライターキャッシュをクリア
    writerCache.clear();
    
    // 記事を取得（認証があれば下書き・非公開も含む）
    console.log('📝 Fetching posts...');
    if (WP_AUTH_HEADER) {
      console.log('  🔐 Authenticated: Including draft/private posts');
    }
    const posts = await fetchAllPages<WPPost>('posts', limit, !!WP_AUTH_HEADER);
    console.log(`  Found ${posts.length} posts\n`);
    
    // 固定ページを取得（内部リンク変換に使用 + オプションで移行）
    console.log('📄 Fetching pages...');
    const wpPages = await fetchAllPages<WPPage>('pages');
    console.log(`  Found ${wpPages.length} pages\n`);
    
    // 固定ページのスラッグを設定（内部リンク変換用）
    const pageSlugs = wpPages.map(page => page.slug);
    setPageSlugs(pageSlugs);
    console.log(`  Set ${pageSlugs.length} page slugs for internal link conversion\n`);
    
    // アイキャッチ画像URLを取得（記事＋固定ページ）
    console.log('🖼️  Fetching featured images...');
    const postMediaIds = posts.map(post => post.featured_media).filter(id => id > 0);
    const pageMediaIds = wpPages.map(page => page.featured_media).filter(id => id > 0);
    const allMediaIds = [...new Set([...postMediaIds, ...pageMediaIds])];
    const mediaMap = new Map<number, string>();
    
    // 並列でアイキャッチ画像を取得（バッチサイズ10）
    const BATCH_SIZE = 10;
    for (let i = 0; i < allMediaIds.length; i += BATCH_SIZE) {
      const batch = allMediaIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (mid) => {
          try {
            const mediaData = await fetchSingleFromWordPress<WPMedia>(`media/${mid}`);
            return { mid, url: mediaData?.source_url || null };
          } catch {
            return { mid, url: null };
          }
        })
      );
      
      for (const { mid, url } of results) {
        if (url) {
          mediaMap.set(mid, url);
        }
      }
      
      if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= allMediaIds.length) {
        console.log(`  Fetched ${Math.min(i + BATCH_SIZE, allMediaIds.length)}/${allMediaIds.length} featured images...`);
      }
    }
    console.log(`  Found ${mediaMap.size} featured images\n`);
    
    // 記事を移行
    console.log('🚀 Starting article migration...');
    let articleSuccessCount = 0;
    let articleErrorCount = 0;
    
    for (const post of posts) {
      try {
        await migrateArticle(post, categoryMap, tagMap, userMap, mediaMap, mediaId, dryRun);
        articleSuccessCount++;
      } catch (error) {
        console.error(`  ❌ Error migrating "${post.title.rendered}":`, error);
        articleErrorCount++;
      }
    }
    
    // 固定ページを移行（オプション）
    let pageSuccessCount = 0;
    let pageErrorCount = 0;
    
    if (includePages) {
      console.log('\n🚀 Starting page migration...');
      const pageSlugToIdMap = new Map<string, string>();
      
      for (const wpPage of wpPages) {
        try {
          await migratePage(wpPage, mediaMap, pageSlugToIdMap, mediaId, dryRun);
          pageSuccessCount++;
        } catch (error) {
          console.error(`  ❌ Error migrating page "${wpPage.title.rendered}":`, error);
          pageErrorCount++;
        }
      }
      
      // 親子関係を更新
      await updatePageParentRelations(wpPages, pageSlugToIdMap, mediaId, dryRun);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Migration completed!');
    console.log('='.repeat(60));
    console.log(`📝 Articles: ✅ ${articleSuccessCount} | ❌ ${articleErrorCount}`);
    if (includePages) {
      console.log(`📄 Pages: ✅ ${pageSuccessCount} | ❌ ${pageErrorCount}`);
    }
    
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

