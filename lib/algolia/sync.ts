import { Article } from '@/types/article';
import { Lang, SUPPORTED_LANGS } from '@/types/lang';
import { adminClient, getArticlesIndexName } from './client';
import { localizeArticle } from '@/lib/i18n/localize';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Algolia の 1 レコードあたりのサイズ上限（UTF-8 バイト）。
 * Grow / Premium プラン以上では 1 レコード最大 100KB まで利用できるため、
 * 計測差・base メタデータ分の余裕を見込んで 99000 bytes を上限とする。
 * （Build プランで運用する場合は 9600 等まで下げる必要がある）
 */
export const ALGOLIA_MAX_RECORD_UTF8_BYTES = 99000;

/** UTF-8 で maxBytes を超えないように末尾で切り詰め（サロゲート分割なし） */
export function truncateUtf8ToMaxBytes(s: string, maxBytes: number): string {
  const enc = new TextEncoder();
  const buf = enc.encode(s);
  if (buf.length <= maxBytes) return s;
  const dec = new TextDecoder('utf-8', { fatal: false });
  return dec.decode(buf.subarray(0, maxBytes));
}

function jsonUtf8ByteLength(obj: unknown): number {
  return new TextEncoder().encode(JSON.stringify(obj)).length;
}

/**
 * `publishedAt` のような日時値を Algolia 用の Unix ミリ秒に正規化する。
 *
 * 受け取り得る型:
 *   - `Date`
 *   - `number` (既に ms)
 *   - `string` (ISO など)
 *   - Firebase Admin / Client SDK の `Timestamp` ({ seconds, nanoseconds } もしくは toDate())
 *   - null / undefined / その他
 *
 * 過去に `new Date(timestampObj).getTime()` だけで処理していたため Firestore Timestamp は
 * Invalid Date → NaN → JSON.stringify で null になり、Algolia 上で publishedAt が null として
 * 保存されていた (検索 UI 上で 1970-01-01 表示の原因)。
 */
function toUnixMs(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof value === 'string') {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof v.toMillis === 'function') {
      const t = v.toMillis();
      return Number.isFinite(t) ? t : 0;
    }
    if (typeof v.toDate === 'function') {
      const t = v.toDate().getTime();
      return Number.isFinite(t) ? t : 0;
    }
    if (typeof v.seconds === 'number') {
      return v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000);
    }
  }
  return 0;
}

/** HTML から Algolia 検索用プレーンテキストへ（管理画面の全文検索は HTML 付きだが、検索の近似としてプレーン化する） */
export function htmlToAlgoliaPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** buf[start:end] が UTF-8 境界になるよう end を start 側へ調整 */
function shrinkEndToUtf8Boundary(buf: Uint8Array, start: number, end: number): number {
  let e = Math.min(end, buf.length);
  while (e > start && (buf[e - 1] & 0xc0) === 0x80) {
    e--;
  }
  return e;
}

/** start から最低 1 文字分進める（無限ループ防止） */
function advanceOneUtf8Char(buf: Uint8Array, start: number): number {
  if (start >= buf.length) return start;
  const b = buf[start];
  if ((b & 0x80) === 0) return start + 1;
  if ((b & 0xe0) === 0xc0) return Math.min(start + 2, buf.length);
  if ((b & 0xf0) === 0xe0) return Math.min(start + 3, buf.length);
  if ((b & 0xf8) === 0xf0) return Math.min(start + 4, buf.length);
  return start + 1;
}

export type AlgoliaContentFields = {
  contentText: string;
  contentTextChunks?: string[];
};

/**
 * プレーンテキストをレコード JSON 全体が ALGOLIA_MAX_RECORD_UTF8_BYTES 以下になるまで複数チャンクに分割する。
 */
export function packPlainTextForAlgoliaRecord(
  plain: string,
  baseWithoutContent: Omit<AlgoliaArticleRecord, 'contentText' | 'contentTextChunks'>
): AlgoliaContentFields {
  if (!plain) {
    const empty: AlgoliaArticleRecord = {
      ...baseWithoutContent,
      contentText: '',
    };
    if (jsonUtf8ByteLength(empty) > ALGOLIA_MAX_RECORD_UTF8_BYTES) {
      console.warn(
        `[Algolia] Record ${baseWithoutContent.objectID} exceeds size budget without body (metadata too large)`
      );
    }
    return { contentText: '' };
  }

  const buf = new TextEncoder().encode(plain);
  const chunks: string[] = [];
  let start = 0;
  const dec = new TextDecoder('utf-8', { fatal: false });
  const maxChunks = 48;

  while (start < buf.length && chunks.length < maxChunks) {
    let lo = start + 1;
    let hi = buf.length;
    let bestEnd = start;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      let end = shrinkEndToUtf8Boundary(buf, start, mid);
      if (end <= start) {
        end = advanceOneUtf8Char(buf, start);
      }
      const slice = dec.decode(buf.subarray(start, end));
      const candidateChunks = [...chunks, slice];
      const candidate: AlgoliaArticleRecord = {
        ...baseWithoutContent,
        contentText: candidateChunks[0] ?? '',
        // 先頭チャンクは contentText にのみ保持し、続きだけを配列に載せて JSON を二重にしない
        ...(candidateChunks.length > 1 ? { contentTextChunks: candidateChunks.slice(1) } : {}),
      };
      if (jsonUtf8ByteLength(candidate) <= ALGOLIA_MAX_RECORD_UTF8_BYTES) {
        bestEnd = end;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (bestEnd <= start) {
      const forcedEnd = advanceOneUtf8Char(buf, start);
      const slice = dec.decode(buf.subarray(start, forcedEnd));
      chunks.push(slice);
      start = forcedEnd;
      continue;
    }

    chunks.push(dec.decode(buf.subarray(start, bestEnd)));
    start = bestEnd;
  }

  if (start < buf.length) {
    console.warn(
      `[Algolia] Plain text truncated for record ${baseWithoutContent.objectID}: ${buf.length - start} byte(s) not indexed`
    );
  }

  if (chunks.length === 0) {
    return { contentText: '' };
  }
  if (chunks.length === 1) {
    return { contentText: chunks[0] };
  }
  return { contentText: chunks[0], contentTextChunks: chunks.slice(1) };
}

// AlgoliaRecord型（Algoliaに保存する形式）
export interface AlgoliaArticleRecord {
  objectID: string; // Algolia用のID（articleのIDと同じ）
  title: string;
  slug: string;
  excerpt?: string;
  contentText?: string;
  /** 本文 2 チャンク目以降（先頭は contentText のみ） */
  contentTextChunks?: string[];
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

        const plain = htmlToAlgoliaPlainText(localizedArticle.content || '');
        const baseWithoutContent: Omit<AlgoliaArticleRecord, 'contentText' | 'contentTextChunks'> = {
          objectID: article.id,
          title: localizedArticle.title,
          slug: article.slug, // slugは言語共通
          excerpt: localizedArticle.excerpt,
          mediaId: article.mediaId,
          categories: categoryNames,
          tags: tagNames,
          publishedAt: toUnixMs(article.publishedAt),
          isPublished: article.isPublished,
          featuredImage: article.featuredImage,
          featuredImageAlt: article.featuredImageAlt,
          viewCount: article.viewCount || 0,
        };
        const packed = packPlainTextForAlgoliaRecord(plain, baseWithoutContent);
        const record: AlgoliaArticleRecord = {
          ...baseWithoutContent,
          ...packed,
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
