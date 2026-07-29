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
      { id: 'pages-overview', label: '固定ページとは' },
      { id: 'pages-list', label: '一覧の使い方' },
      { id: 'pages-create', label: '新規作成の手順' },
      { id: 'pages-edit', label: '編集画面の基本' },
      { id: 'pages-blocks', label: 'ブロックの追加と編集' },
      { id: 'pages-settings', label: 'ページ設定タブ' },
      { id: 'pages-compare', label: '変更の比較' },
      { id: 'pages-history', label: '変更履歴と復元' },
      { id: 'pages-preview', label: '公開前の確認' },
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
  {
    id: 'custom-blocks',
    label: 'カスタムブロック',
    children: [
      { id: 'custom-blocks-basics', label: '基本の使い方' },
      { id: 'custom-blocks-compare', label: '比較と変更履歴' },
    ],
  },
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
