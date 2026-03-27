export type TocChild = { id: string; label: string };

export type TocSection = {
  id: string;
  label: string;
  children?: TocChild[];
};

/** ドキュメント左サイドバー用の階層目次 */
export const DOC_TOC: TocSection[] = [
  { id: 'intro', label: 'はじめに' },
  { id: 'dashboard', label: 'ダッシュボード' },
  { id: 'accounts', label: 'アカウント' },
  {
    id: 'articles',
    label: 'アーティクル',
    children: [
      { id: 'articles-list', label: '一覧の使い方' },
      { id: 'articles-edit', label: '新規作成・編集画面' },
      { id: 'articles-generate', label: 'AI記事生成' },
      { id: 'articles-schedule', label: 'スケジュール生成' },
    ],
  },
  { id: 'categories', label: 'カテゴリー' },
  { id: 'tags', label: 'タグ' },
  { id: 'writers', label: 'ライター' },
  { id: 'site', label: 'サイト' },
  {
    id: 'preview-url',
    label: 'プレビューURLと本番の違い',
    children: [
      { id: 'preview-url-basics', label: 'URLと役割' },
      { id: 'preview-url-access-seo', label: 'アクセス制御と検索' },
      { id: 'preview-url-content', label: '表示されるコンテンツ' },
      { id: 'preview-url-cache', label: 'キャッシュの仕組み' },
    ],
  },
  {
    id: 'pages',
    label: 'ページ',
    children: [
      { id: 'pages-list', label: '一覧と固定ページ' },
      { id: 'pages-edit', label: 'ブロック編集とAI' },
    ],
  },
  {
    id: 'forms',
    label: 'フォーム',
    children: [
      { id: 'forms-list', label: '一覧と設置確認' },
      { id: 'forms-build', label: 'フィールドと設定タブ' },
      { id: 'forms-submissions', label: '送信一覧' },
    ],
  },
  { id: 'custom-blocks', label: 'カスタムブロック' },
  {
    id: 'theme',
    label: 'テーマ',
    children: [
      { id: 'theme-layout', label: 'レイアウトとタブ一覧' },
      { id: 'theme-tabs', label: '各タブでできること' },
    ],
  },
  { id: 'media', label: 'メディアライブラリ' },
  {
    id: 'site-import',
    label: 'サイトインポート',
    children: [
      { id: 'site-import-flow', label: '手順と注意点' },
    ],
  },
];
