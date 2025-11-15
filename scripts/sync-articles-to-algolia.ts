/**
 * 既存の全記事をAlgoliaに同期するスクリプト
 * 
 * 実行方法:
 * npx ts-node --compiler-options '{"module":"commonjs"}' scripts/sync-articles-to-algolia.ts
 */

// 環境変数を読み込む
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { adminDb } from '../lib/firebase/admin';
import { bulkSyncArticlesToAlgolia } from '../lib/algolia/sync';
import { AlgoliaArticleRecord } from '../lib/algolia/sync';

async function syncAllArticles() {
  console.log('🚀 記事のAlgolia同期を開始します...\n');

  try {
    // 全記事を取得
    const articlesSnapshot = await adminDb
      .collection('articles')
      .where('isPublished', '==', true)
      .get();

    console.log(`📊 ${articlesSnapshot.size}件の公開記事が見つかりました\n`);

    const records: AlgoliaArticleRecord[] = [];

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

      // Algoliaレコードを作成
      const record: AlgoliaArticleRecord = {
        objectID: doc.id,
        title: data.title || '',
        slug: data.slug || '',
        excerpt: data.excerpt,
        content: data.content || '',
        mediaId: data.mediaId || '',
        categories: categoryNames,
        tags: tagNames,
        publishedAt: data.publishedAt?.toDate?.()?.getTime() || Date.now(),
        isPublished: data.isPublished || false,
      };

      records.push(record);

      console.log(`✅ 準備完了: ${record.title} (ID: ${doc.id})`);
    }

    // 一括でAlgoliaに同期
    if (records.length > 0) {
      console.log(`\n📤 ${records.length}件の記事をAlgoliaに同期中...`);
      await bulkSyncArticlesToAlgolia(records);
      console.log('\n🎉 同期が完了しました！');
    } else {
      console.log('\n⚠️ 同期する記事がありませんでした');
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

