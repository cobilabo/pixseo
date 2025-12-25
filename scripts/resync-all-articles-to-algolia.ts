/**
 * 全公開記事をAlgoliaに再同期するスクリプト
 * contentText、categories、tagsを正しく設定
 * 
 * 使用方法:
 *   npx ts-node -O '{"module":"commonjs"}' scripts/resync-all-articles-to-algolia.ts
 *   npx ts-node -O '{"module":"commonjs"}' scripts/resync-all-articles-to-algolia.ts --limit 10
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as admin from 'firebase-admin';
import { algoliasearch } from 'algoliasearch';

// Firebase Admin初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json')),
  });
}

const db = admin.firestore();

// Algolia クライアント
const algoliaClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

const SUPPORTED_LANGS = ['ja', 'en', 'zh', 'ko'] as const;
type Lang = typeof SUPPORTED_LANGS[number];

interface AlgoliaArticleRecord {
  objectID: string;
  title: string;
  slug: string;
  excerpt?: string;
  contentText?: string;
  mediaId: string;
  categories: string[];
  tags: string[];
  publishedAt: number;
  isPublished: boolean;
  featuredImage?: string;
  featuredImageAlt?: string;
  viewCount?: number;
}

// カテゴリー/タグのキャッシュ
const categoryCache: Map<string, Record<string, string>> = new Map();
const tagCache: Map<string, Record<string, string>> = new Map();

// カテゴリー名を取得
async function getCategoryName(catId: string, lang: Lang): Promise<string> {
  if (!categoryCache.has(catId)) {
    const doc = await db.collection('categories').doc(catId).get();
    if (doc.exists) {
      categoryCache.set(catId, doc.data() as Record<string, string>);
    } else {
      return '';
    }
  }
  const data = categoryCache.get(catId);
  return data?.[`name_${lang}`] || data?.name || '';
}

// タグ名を取得
async function getTagName(tagId: string, lang: Lang): Promise<string> {
  if (!tagCache.has(tagId)) {
    const doc = await db.collection('tags').doc(tagId).get();
    if (doc.exists) {
      tagCache.set(tagId, doc.data() as Record<string, string>);
    } else {
      return '';
    }
  }
  const data = tagCache.get(tagId);
  return data?.[`name_${lang}`] || data?.name || '';
}

// HTMLからテキストを抽出
function extractTextFromHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1500);
}

// 記事をローカライズ
function localizeArticle(article: any, lang: Lang) {
  const title = article[`title_${lang}`] || article.title || '';
  const content = article[`content_${lang}`] || article.content || '';
  const excerpt = article[`excerpt_${lang}`] || article.excerpt || '';
  return { title, content, excerpt };
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : undefined;

  console.log('=== Algolia再同期スクリプト開始 ===');
  console.log(`制限: ${limit || '無制限'}`);

  // 公開記事を取得
  let query = db.collection('articles').where('isPublished', '==', true);
  const snapshot = await query.get();
  
  let articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`公開記事数: ${articles.length}`);

  if (limit) {
    articles = articles.slice(0, limit);
    console.log(`制限適用後: ${articles.length}件`);
  }

  // 言語ごとにレコードを作成
  const recordsByLang: Record<Lang, AlgoliaArticleRecord[]> = {
    ja: [], en: [], zh: [], ko: []
  };

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i] as any;
    console.log(`[${i + 1}/${articles.length}] 処理中: ${article.title?.substring(0, 30)}...`);

    for (const lang of SUPPORTED_LANGS) {
      const localized = localizeArticle(article, lang);
      
      // カテゴリー名を取得
      const categoryNames: string[] = [];
      if (article.categoryIds && Array.isArray(article.categoryIds)) {
        for (const catId of article.categoryIds) {
          const name = await getCategoryName(catId, lang);
          if (name) categoryNames.push(name);
        }
      }

      // タグ名を取得
      const tagNames: string[] = [];
      if (article.tagIds && Array.isArray(article.tagIds)) {
        for (const tagId of article.tagIds) {
          const name = await getTagName(tagId, lang);
          if (name) tagNames.push(name);
        }
      }

      // contentTextを抽出
      const contentText = extractTextFromHtml(localized.content);

      const record: AlgoliaArticleRecord = {
        objectID: `${article.id}_${lang}`,
        title: localized.title || article.title || '',
        slug: article.slug || '',
        excerpt: localized.excerpt || '',
        contentText,
        mediaId: article.mediaId || '',
        categories: categoryNames,
        tags: tagNames,
        publishedAt: article.publishedAt?.toDate?.()?.getTime() || 
                     (article.publishedAt ? new Date(article.publishedAt).getTime() : 0),
        isPublished: true,
        featuredImage: article.featuredImage || '',
        featuredImageAlt: article.featuredImageAlt || '',
        viewCount: article.viewCount || 0,
      };

      recordsByLang[lang].push(record);
    }
  }

  // Algoliaに一括登録
  console.log('\n=== Algoliaに登録中 ===');
  for (const lang of SUPPORTED_LANGS) {
    const records = recordsByLang[lang];
    const indexName = `pixseo_articles_production_${lang}`;
    
    console.log(`${lang}: ${records.length}件を登録中...`);
    
    // 100件ずつバッチ処理
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      await algoliaClient.saveObjects({
        indexName,
        objects: batch as unknown as Array<Record<string, unknown>>,
      });
      console.log(`  ${lang}: ${Math.min(i + 100, records.length)}/${records.length} 完了`);
    }
  }

  console.log('\n=== 完了 ===');
  console.log('サンプルデータ確認:');
  const sample = recordsByLang.ja[0];
  if (sample) {
    console.log('  objectID:', sample.objectID);
    console.log('  title:', sample.title?.substring(0, 50));
    console.log('  contentText:', sample.contentText?.substring(0, 100) + '...');
    console.log('  categories:', sample.categories);
    console.log('  tags:', sample.tags);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});

