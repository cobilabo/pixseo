/**
 * functions-scheduled 用の最小 Algolia 同期ロジック。
 *
 * Next.js 側の `lib/algolia/sync.ts` のロジックを移植したもの。
 * モノレポ化は行わず、Cloud Functions の独立性を優先して duplicate を許容している。
 * 大きく挙動を変える場合は両方を揃えること（特に ALGOLIA_MAX_RECORD_UTF8_BYTES と
 * `packPlainTextForAlgoliaRecord` の挙動）。
 */
import type { algoliasearch } from "algoliasearch";
import * as admin from "firebase-admin";

type AlgoliaClient = ReturnType<typeof algoliasearch>;

export const SUPPORTED_LANGS = ["ja", "en", "zh", "ko"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const ARTICLES_INDEX_BASE = "pixseo_articles_production";
export const getArticlesIndexName = (lang: Lang): string => `${ARTICLES_INDEX_BASE}_${lang}`;

/** Grow / Premium プラン (1 レコード最大 100KB) を前提とした上限値 */
const ALGOLIA_MAX_RECORD_UTF8_BYTES = 99000;

export interface AlgoliaArticleRecord {
  objectID: string;
  title: string;
  slug: string;
  excerpt?: string;
  contentText?: string;
  contentTextChunks?: string[];
  mediaId: string;
  categories: string[];
  tags: string[];
  publishedAt: number;
  updatedAt?: number;
  isPublished: boolean;
  featuredImage?: string;
  featuredImageAlt?: string;
  viewCount?: number;
}

function jsonUtf8ByteLength(obj: unknown): number {
  return new TextEncoder().encode(JSON.stringify(obj)).length;
}

function htmlToAlgoliaPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function shrinkEndToUtf8Boundary(buf: Uint8Array, start: number, end: number): number {
  let e = Math.min(end, buf.length);
  while (e > start && (buf[e - 1] & 0xc0) === 0x80) e--;
  return e;
}

function advanceOneUtf8Char(buf: Uint8Array, start: number): number {
  if (start >= buf.length) return start;
  const b = buf[start];
  if ((b & 0x80) === 0) return start + 1;
  if ((b & 0xe0) === 0xc0) return Math.min(start + 2, buf.length);
  if ((b & 0xf0) === 0xe0) return Math.min(start + 3, buf.length);
  if ((b & 0xf8) === 0xf0) return Math.min(start + 4, buf.length);
  return start + 1;
}

type ContentFields = { contentText: string; contentTextChunks?: string[] };

function packPlainTextForAlgoliaRecord(
  plain: string,
  baseWithoutContent: Omit<AlgoliaArticleRecord, "contentText" | "contentTextChunks">
): ContentFields {
  if (!plain) return { contentText: "" };
  const buf = new TextEncoder().encode(plain);
  const dec = new TextDecoder("utf-8", { fatal: false });
  const chunks: string[] = [];
  let start = 0;
  const maxChunks = 48;

  while (start < buf.length && chunks.length < maxChunks) {
    let lo = start + 1;
    let hi = buf.length;
    let bestEnd = start;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      let end = shrinkEndToUtf8Boundary(buf, start, mid);
      if (end <= start) end = advanceOneUtf8Char(buf, start);
      const slice = dec.decode(buf.subarray(start, end));
      const candidateChunks = [...chunks, slice];
      const candidate = {
        ...baseWithoutContent,
        contentText: candidateChunks[0] ?? "",
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
      const forced = advanceOneUtf8Char(buf, start);
      chunks.push(dec.decode(buf.subarray(start, forced)));
      start = forced;
      continue;
    }
    chunks.push(dec.decode(buf.subarray(start, bestEnd)));
    start = bestEnd;
  }

  if (chunks.length === 0) return { contentText: "" };
  if (chunks.length === 1) return { contentText: chunks[0] };
  return { contentText: chunks[0], contentTextChunks: chunks.slice(1) };
}

function localizeArticleField(article: any, lang: Lang, field: string): string {
  return article[`${field}_${lang}`] || article[field] || "";
}

async function getLocalizedNames(
  db: admin.firestore.Firestore,
  collection: "categories" | "tags",
  ids: string[] | undefined,
  lang: Lang
): Promise<string[]> {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return [];
  const names: string[] = [];
  for (const id of ids) {
    try {
      const doc = await db.collection(collection).doc(id).get();
      if (doc.exists) {
        const data = doc.data();
        const localized = data?.[`name_${lang}`] || data?.name || "";
        if (localized) names.push(localized);
      }
    } catch (e) {
      console.error(`[Algolia] failed to fetch ${collection}/${id}:`, e);
    }
  }
  return names;
}

/**
 * 記事を 4 言語インデックスへ同期する（Next.js 側 syncArticleToAlgolia と同等の挙動）。
 * 失敗してもスローせず、言語ごとにエラーログだけ出して継続する。
 */
export async function syncArticleToAlgolia(
  client: AlgoliaClient,
  db: admin.firestore.Firestore,
  article: any
): Promise<void> {
  const articleId = article?.id;
  if (!articleId) {
    console.error("[Algolia] syncArticleToAlgolia: article.id is missing");
    return;
  }

  const toUnixMs = (value: unknown): number => {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value instanceof Date) {
      const t = value.getTime();
      return Number.isFinite(t) ? t : 0;
    }
    if (typeof value === "string") {
      const t = new Date(value).getTime();
      return Number.isFinite(t) ? t : 0;
    }
    if (typeof value === "object") {
      const v = value as { toDate?: () => Date; toMillis?: () => number; seconds?: number; nanoseconds?: number };
      if (typeof v.toMillis === "function") {
        const t = v.toMillis();
        return Number.isFinite(t) ? t : 0;
      }
      if (typeof v.toDate === "function") {
        const t = v.toDate().getTime();
        return Number.isFinite(t) ? t : 0;
      }
      if (typeof v.seconds === "number") {
        return v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000);
      }
    }
    return 0;
  };

  const publishedAtMs = toUnixMs(article.publishedAt);
  const updatedAtMs = toUnixMs(article.updatedAt);

  await Promise.all(
    SUPPORTED_LANGS.map(async (lang) => {
      try {
        const title = localizeArticleField(article, lang, "title");
        const content = localizeArticleField(article, lang, "content");
        const excerpt = localizeArticleField(article, lang, "excerpt");
        const featuredImageAlt = localizeArticleField(article, lang, "featuredImageAlt");

        const categoryNames = await getLocalizedNames(db, "categories", article.categoryIds, lang);
        const tagNames = await getLocalizedNames(db, "tags", article.tagIds, lang);

        const plain = htmlToAlgoliaPlainText(content);
        const baseWithoutContent: Omit<AlgoliaArticleRecord, "contentText" | "contentTextChunks"> = {
          objectID: articleId,
          title,
          slug: article.slug || "",
          excerpt,
          mediaId: article.mediaId || "",
          categories: categoryNames,
          tags: tagNames,
          publishedAt: publishedAtMs,
          updatedAt: updatedAtMs,
          isPublished: !!article.isPublished,
          featuredImage: article.featuredImage,
          featuredImageAlt,
          viewCount: article.viewCount || 0,
        };
        const packed = packPlainTextForAlgoliaRecord(plain, baseWithoutContent);
        const record: AlgoliaArticleRecord = { ...baseWithoutContent, ...packed };

        await client.saveObject({
          indexName: getArticlesIndexName(lang),
          body: record,
        });
        console.log(
          `[Algolia] Synced article to ${lang} index: ${articleId} (cats=${categoryNames.length}, tags=${tagNames.length})`
        );
      } catch (e) {
        console.error(`[Algolia] sync error (${lang}) for ${articleId}:`, e);
      }
    })
  );
}