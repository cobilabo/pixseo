import { Article } from '@/types/article';
import { Lang, SUPPORTED_LANGS } from '@/types/lang';
import { adminClient, getArticlesIndexName } from './client';
import { localizeArticle } from '@/lib/i18n/localize';
import { adminDb } from '@/lib/firebase/admin';

// AlgoliaRecord型（Algoliaに保存する形式）
export interface AlgoliaArticleRecord {
  objectID: string; // Algolia用のID（articleのIDと同じ）
  title: string;
  slug: string;
  excerpt?: string;
  contentText?: string; // HTMLタグを除去したテキスト（検索用、最大3000文字）
  mediaId: string;
  categories: string[]; // カテゴリー名の配列
  tags: string[]; // タグ名の配列
  publishedAt: number; // Unixタイムスタンプ
  isPublished: boolean;
  featuredImage?: string; // アイキャッチ画像URL
  featuredImageAlt?: string; // アイキャッチ画像のalt属性
  viewCount?: number; // 閲覧数
}

/**
 * 記事を全言語のAlgoliaインデックスに追加/更新
 */
export async function syncArticleToAlgolia(
  article: Article
): Promise<void> {
  if (!adminClient) {
    console.error('[Algolia] Admin client not initialized');
    return;
  }

  // TypeScriptのnullチェック対応
  const client = adminClient;

  try {
    // 各言語ごとにインデックスに保存
    const syncPromises = SUPPORTED_LANGS.map(async (lang) => {
      try {
        // 記事を言語別にローカライズ
        const localizedArticle = localizeArticle(article, lang);
        
        // その言語のカテゴリー名を取得
        const categoryNames: string[] = [];
        if (article.categoryIds && Array.isArray(article.categoryIds)) {
          for (const catId of article.categoryIds) {
            try {
              const catDoc = await adminDb.collection('categories').doc(catId).get();
              if (catDoc.exists) {
                const catData = catDoc.data();
                // 言語別のフィールドから取得（例: name_en, name_zh）
                const localizedName = catData?.[`name_${lang}`] || catData?.name || '';
                if (localizedName) {
                  categoryNames.push(localizedName);
                }
              }
            } catch (error) {
              console.error(`[Algolia] Error fetching category ${catId}:`, error);
            }
          }
        }

        // その言語のタグ名を取得
        const tagNames: string[] = [];
        if (article.tagIds && Array.isArray(article.tagIds)) {
          for (const tagId of article.tagIds) {
            try {
              const tagDoc = await adminDb.collection('tags').doc(tagId).get();
              if (tagDoc.exists) {
                const tagData = tagDoc.data();
                // 言語別のフィールドから取得（例: name_en, name_zh）
                const localizedName = tagData?.[`name_${lang}`] || tagData?.name || '';
                if (localizedName) {
                  tagNames.push(localizedName);
                }
              }
            } catch (error) {
              console.error(`[Algolia] Error fetching tag ${tagId}:`, error);
            }
          }
        }
        
        // HTMLタグを除去してテキストのみ抽出（検索用）
        let contentText = '';
        if (localizedArticle.content) {
          contentText = localizedArticle.content
            .replace(/<[^>]*>/g, '') // HTMLタグを削除
            .replace(/&nbsp;/g, ' ') // &nbsp;をスペースに変換
            .replace(/&amp;/g, '&') // &amp;を&に変換
            .replace(/&lt;/g, '<') // &lt;を<に変換
            .replace(/&gt;/g, '>') // &gt;を>に変換
            .replace(/&quot;/g, '"') // &quot;を"に変換
            .replace(/\s+/g, ' ') // 連続した空白を1つに
            .trim()
            .substring(0, 3000); // 最初の3000文字のみ（約3KB、安全マージン）
        }

        const record: AlgoliaArticleRecord = {
          objectID: article.id,
          title: localizedArticle.title,
          slug: article.slug, // slugは言語共通
          excerpt: localizedArticle.excerpt,
          contentText, // HTMLタグを除去したテキスト
          mediaId: article.mediaId,
          categories: categoryNames, // その言語のカテゴリー名
          tags: tagNames, // その言語のタグ名
          publishedAt: article.publishedAt instanceof Date
            ? article.publishedAt.getTime()
            : new Date(article.publishedAt).getTime(),
          isPublished: article.isPublished,
          featuredImage: article.featuredImage,
          featuredImageAlt: article.featuredImageAlt,
          viewCount: article.viewCount || 0,
        };

        const indexName = getArticlesIndexName(lang);
        await client.saveObject({
          indexName,
          body: record,
        });
        
        console.log(`[Algolia] Synced article to ${lang} index: ${article.id} (${categoryNames.length} categories, ${tagNames.length} tags)`);
      } catch (error) {
        console.error(`[Algolia] Error syncing article to ${lang} index:`, error);
        // 1つの言語で失敗しても他の言語は続行
      }
    });

    // 全言語の同期を並行実行
    await Promise.all(syncPromises);
    console.log(`[Algolia] Successfully synced article ${article.id} to all language indexes`);
  } catch (error) {
    console.error('[Algolia] Error syncing article:', error);
    throw error;
  }
}

/**
 * 記事を全言語のAlgoliaインデックスから削除
 */
export async function deleteArticleFromAlgolia(articleId: string): Promise<void> {
  if (!adminClient) {
    console.error('[Algolia] Admin client not initialized');
    return;
  }

  // TypeScriptのnullチェック対応
  const client = adminClient;

  try {
    // 各言語のインデックスから削除
    const deletePromises = SUPPORTED_LANGS.map(async (lang) => {
      try {
        const indexName = getArticlesIndexName(lang);
        await client.deleteObject({
          indexName,
          objectID: articleId,
        });
        console.log(`[Algolia] Deleted article from ${lang} index: ${articleId}`);
      } catch (error) {
        console.error(`[Algolia] Error deleting article from ${lang} index:`, error);
        // 1つの言語で失敗しても他の言語は続行
      }
    });

    await Promise.all(deletePromises);
    console.log(`[Algolia] Successfully deleted article ${articleId} from all language indexes`);
  } catch (error) {
    console.error('[Algolia] Error deleting article:', error);
    throw error;
  }
}

/**
 * 複数の記事を指定言語のAlgoliaインデックスに一括同期
 */
export async function bulkSyncArticlesToAlgolia(
  records: AlgoliaArticleRecord[],
  lang: Lang
): Promise<void> {
  if (!adminClient) {
    console.error('[Algolia] Admin client not initialized');
    return;
  }

  // TypeScriptのnullチェック対応
  const client = adminClient;

  try {
    const indexName = getArticlesIndexName(lang);
    await client.saveObjects({
      indexName,
      objects: records as unknown as Array<Record<string, unknown>>,
    });
    
    console.log(`[Algolia] Bulk synced ${records.length} articles to ${lang} index`);
  } catch (error) {
    console.error(`[Algolia] Error bulk syncing articles to ${lang} index:`, error);
    throw error;
  }
}
