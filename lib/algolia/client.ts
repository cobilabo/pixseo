import { algoliasearch } from 'algoliasearch';
import { Lang } from '@/types/lang';

// フロントエンド用クライアント（検索のみ）
export const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

// サーバーサイド用クライアント（書き込み可能）
export const adminClient = process.env.ALGOLIA_ADMIN_KEY
  ? algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
      process.env.ALGOLIA_ADMIN_KEY
    )
  : null;

// 言語別インデックス名
export const ARTICLES_INDEX_BASE = 'pixseo_articles_production';

export function getArticlesIndexName(lang: Lang): string {
  return `${ARTICLES_INDEX_BASE}_${lang}`;
}

// 後方互換性のため（既存コードで使用されている場合）
export const ARTICLES_INDEX = getArticlesIndexName('ja');
