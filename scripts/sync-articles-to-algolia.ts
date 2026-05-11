/**
 * 既存の全記事をAlgoliaに同期するスクリプト
 * 
 * 実行方法:
 * npx tsx scripts/sync-articles-to-algolia.ts
 *
 * 注意: Algolia / Firebase を import する前に .env を読む（静的 import の評価順のため）
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import type { AlgoliaArticleRecord } from '../lib/algolia/sync';
import { SUPPORTED_LANGS, type Lang } from '../types/lang';

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
loadEnv();

async function syncAllArticles() {
  const { adminDb } = await import('../lib/firebase/admin');
  const {
    htmlToAlgoliaPlainText,
    packPlainTextForAlgoliaRecord,
    bulkSyncArticlesToAlgolia,
  } = await import('../lib/algolia/sync');
  const { localizeArticle } = await import('../lib/i18n/localize');

  console.log('🚀 記事のAlgolia同期を開始します...\n');

  try {
    // 全記事を取得
    const articlesSnapshot = await adminDb
      .collection('articles')
      .where('isPublished', '==', true)
      .get();

    console.log(`📊 ${articlesSnapshot.size}件の公開記事が見つかりました\n`);

    // 言語別のレコード配列
    const recordsByLang: Record<Lang, AlgoliaArticleRecord[]> = {
      ja: [],
      en: [],
      zh: [],
      ko: [],
    };

    // カテゴリーとタグのキャッシュ
    const categoryCache = new Map<string, string>();
    const tagCache = new Map<string, string>();

    for (const doc of articlesSnapshot.docs) {
      const data = doc.data();
      
      // カテゴリー名を取得
      const categoryNames: string[] = [];
      if (data.categoryIds && Array.isArray(data.categoryIds)) {
        for (const catId of data.categoryIds) {
          if (categoryCache.has(catId)) {
            categoryNames.push(categoryCache.get(catId)!);
          } else {
            const catDoc = await adminDb.collection('categories').doc(catId).get();
            if (catDoc.exists) {
              const catName = catDoc.data()?.name || '';
              categoryCache.set(catId, catName);
              categoryNames.push(catName);
            }
          }
        }
      }

      // タグ名を取得
      const tagNames: string[] = [];
      if (data.tagIds && Array.isArray(data.tagIds)) {
        for (const tagId of data.tagIds) {
          if (tagCache.has(tagId)) {
            tagNames.push(tagCache.get(tagId)!);
          } else {
            const tagDoc = await adminDb.collection('tags').doc(tagId).get();
            if (tagDoc.exists) {
              const tagName = tagDoc.data()?.name || '';
              tagCache.set(tagId, tagName);
              tagNames.push(tagName);
            }
          }
        }
      }

      // 各言語ごとにレコードを作成
      for (const lang of SUPPORTED_LANGS) {
        // 記事を言語別にローカライズ
        const article = { id: doc.id, ...data };
        const localizedArticle = localizeArticle(article as any, lang);

        const plain = htmlToAlgoliaPlainText(localizedArticle.content || '');
        const baseWithoutContent: Omit<AlgoliaArticleRecord, 'contentText' | 'contentTextChunks'> = {
          objectID: doc.id,
          title: localizedArticle.title || '',
          slug: data.slug || '',
          excerpt: localizedArticle.excerpt,
          mediaId: data.mediaId || '',
          categories: categoryNames,
          tags: tagNames,
          publishedAt: data.publishedAt?.toDate?.()?.getTime() || Date.now(),
          isPublished: data.isPublished || false,
          featuredImage: data.featuredImage,
          featuredImageAlt: data.featuredImageAlt,
          viewCount: data.viewCount || 0,
        };
        const packed = packPlainTextForAlgoliaRecord(plain, baseWithoutContent);

        const record: AlgoliaArticleRecord = {
          ...baseWithoutContent,
          ...packed,
        };

        recordsByLang[lang].push(record);
      }

      console.log(`✅ 準備完了: ${data.title || '無題'} (ID: ${doc.id})`);
    }

    // 各言語のインデックスに一括同期
    for (const lang of SUPPORTED_LANGS) {
      const records = recordsByLang[lang];
      if (records.length > 0) {
        console.log(`\n📤 ${lang}インデックスに${records.length}件の記事を同期中...`);
        await bulkSyncArticlesToAlgolia(records, lang);
        console.log(`✅ ${lang}インデックスの同期が完了しました`);
      }
    }

    const totalRecords = Object.values(recordsByLang).reduce((sum, arr) => sum + arr.length, 0);
    if (totalRecords === 0) {
      console.log('\n⚠️ 同期する記事がありませんでした');
    } else {
      console.log('\n🎉 全言語の同期が完了しました！');
    }

    console.log('\n✨ 処理が完了しました');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
syncAllArticles();

