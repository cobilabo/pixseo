import { algoliasearch } from 'algoliasearch';

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

// インデックス名
export const ARTICLES_INDEX = 'pixseo_articles_production';
