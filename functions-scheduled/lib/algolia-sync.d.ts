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
export declare const SUPPORTED_LANGS: readonly ["ja", "en", "zh", "ko"];
export type Lang = (typeof SUPPORTED_LANGS)[number];
export declare const getArticlesIndexName: (lang: Lang) => string;
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
    isPublished: boolean;
    featuredImage?: string;
    featuredImageAlt?: string;
    viewCount?: number;
}
/**
 * 記事を 4 言語インデックスへ同期する（Next.js 側 syncArticleToAlgolia と同等の挙動）。
 * 失敗してもスローせず、言語ごとにエラーログだけ出して継続する。
 */
export declare function syncArticleToAlgolia(client: AlgoliaClient, db: admin.firestore.Firestore, article: any): Promise<void>;
export {};
