// テーマレイアウト定義
export const THEME_LAYOUTS = {
  cobi: {
    id: 'cobi',
    name: 'Cobi',
    displayName: 'Cobi（シンプル1カラム）',
    description: 'シンプルで読みやすい1カラムレイアウト。記事コンテンツを中心に据えたデザイン。',
    blockPlacements: [
      { value: 'footer', label: 'フッターエリア' },
      { value: 'side-panel', label: 'サイドパネル' },
    ],
  },
  furatto: {
    id: 'furatto',
    name: 'Furatto',
    displayName: 'ふらっと（バリアフリー特化）',
    description: 'アクセシビリティを重視したバリアフリー情報メディア向けレイアウト。',
    blockPlacements: [
      { value: 'top-banner', label: 'トップバナー' },
      { value: 'sidebar-top', label: 'サイドバー上部' },
      { value: 'sidebar-middle', label: 'サイドバー中部' },
      { value: 'sidebar-bottom', label: 'サイドバー下部' },
      { value: 'article-top', label: '記事上部' },
      { value: 'article-bottom', label: '記事下部' },
      { value: 'footer', label: 'フッターエリア' },
    ],
  },
} as const;

export type ThemeLayoutId = keyof typeof THEME_LAYOUTS;

// フッターブロックの定義
export interface FooterBlock {
  imageUrl: string;
  alt: string;
  linkUrl: string;
}

// フッターコンテンツの定義（画像+タイトル+説明）
export interface FooterContent {
  imageUrl: string;
  alt: string;
  // 後方互換性のため既存フィールドを保持
  title: string;
  description: string;
  linkUrl: string;
  // 多言語フィールド
  title_ja?: string;
  title_en?: string;
  title_zh?: string;
  title_ko?: string;
  description_ja?: string;
  description_en?: string;
  description_zh?: string;
  description_ko?: string;
}

// テキストリンクの定義
export interface FooterTextLink {
  // 後方互換性のため既存フィールドを保持
  text: string;
  url: string;
  // 多言語フィールド
  text_ja?: string;
  text_en?: string;
  text_zh?: string;
  text_ko?: string;
}

// テキストリンクセクションの定義
export interface FooterTextLinkSection {
  // 後方互換性のため既存フィールドを保持
  title: string;
  links: FooterTextLink[];
  // 多言語フィールド
  title_ja?: string;
  title_en?: string;
  title_zh?: string;
  title_ko?: string;
}

// メニュー項目の定義
export interface MenuItem {
  // 後方互換性のため既存フィールドを保持
  label: string;
  url: string;
  // 多言語フィールド
  label_ja?: string;
  label_en?: string;
  label_zh?: string;
  label_ko?: string;
}

// メニュー設定の定義
export interface MenuSettings {
  topLabel: string;           // トップ
  articlesLabel: string;      // 記事一覧
  searchLabel: string;        // 検索
  customMenus: MenuItem[];    // 追加メニュー1-5
}

// SNS設定の定義
export interface SnsSettings {
  xUserId?: string;           // X（Twitter）のユーザーID
}

// スクリプト発火条件の定義
export type ScriptTriggerType = 
  | 'all'           // サイト全体
  | 'home'          // トップページのみ
  | 'articles'      // 記事ページ全体
  | 'article-slug'  // 特定の記事（スラッグ指定）
  | 'categories'    // カテゴリーページ全体
  | 'tags'          // タグページ全体
  | 'pages'         // 固定ページ全体
  | 'page-slug'     // 特定の固定ページ（スラッグ指定）
  | 'search'        // 検索ページ
  | 'custom';       // カスタムパス指定

export interface ScriptTrigger {
  type: ScriptTriggerType;
  slugs?: string[];           // スラッグ指定時の対象スラッグ（複数可）
  customPaths?: string[];     // カスタムパス指定時のパス（複数可）
}

// スクリプト設定の定義
export interface ScriptItem {
  id: string;                                      // 一意のID
  name: string;                                    // スクリプト名（管理用）
  code: string;                                    // スクリプトコード（head/body単独時に使用）
  headCode?: string;                               // head用コード（position='both'時に使用）
  bodyCode?: string;                               // body用コード（position='both'時に使用）
  position: 'head' | 'body' | 'both';              // 設置位置
  device: 'all' | 'pc' | 'mobile';                 // 対象デバイス
  trigger: ScriptTrigger;                          // 発火条件
  isEnabled: boolean;                              // 有効/無効
  isTest: boolean;                                 // テストモード（URLパラメータ ?script_test=1 の場合のみ実行）
}

// FV（ファーストビュー）設定の定義
export interface FirstViewSettings {
  imageUrl: string;           // FV画像
  // 後方互換性のため既存フィールドを保持
  catchphrase: string;        // キャッチコピー
  description: string;        // ディスクリプション
  // 多言語フィールド
  catchphrase_ja?: string;
  catchphrase_en?: string;
  catchphrase_zh?: string;
  catchphrase_ko?: string;
  description_ja?: string;
  description_en?: string;
  description_zh?: string;
  description_ko?: string;
}

export interface Theme {
  // レイアウトテーマ
  layoutTheme: ThemeLayoutId; // 'cobi' | 'furatto'
  
  // FV設定
  firstView?: FirstViewSettings;
  
  // フッターブロック（最大4つ）
  footerBlocks?: FooterBlock[];
  
  // フッターコンテンツ（最大3つ）- cobi テーマ用
  footerContents?: FooterContent[];
  
  // テキストリンクセクション（2セット）- cobi テーマ用
  footerTextLinkSections?: FooterTextLinkSection[];
  
  // メニュー設定
  menuSettings?: MenuSettings;
  
  // SNS設定
  snsSettings?: SnsSettings;
  
  // 基本カラー
  primaryColor: string;             // メインカラー
  secondaryColor: string;           // サブカラー
  accentColor: string;              // アクセントカラー
  
  // 背景色
  backgroundColor: string;          // 全体背景色
  headerBackgroundColor: string;    // ヘッダー背景色
  footerBackgroundColor: string;    // フッター背景色
  blockBackgroundColor: string;     // ブロック背景色
  menuBackgroundColor: string;      // メニュー背景色
  menuTextColor: string;            // メニューテキストカラー
  
  // テキスト・リンク
  linkColor: string;                // リンクテキストカラー
  linkHoverColor: string;           // リンクホバーカラー
  
  // 装飾
  borderColor: string;              // ボーダーカラー
  shadowColor: string;              // シャドウカラー（RGBA形式）
  
  // カスタムCSS
  customCss?: string;               // 自由なCSS記述エリア
  
  // カスタムJavaScript
  scripts?: ScriptItem[];           // スクリプト設定（複数可）
  
  // 🔄 後方互換性のために残す（オプショナル）
  panelBackgroundColor?: string;
  textColor?: string;
  primaryButtonColor?: string;
  primaryButtonTextColor?: string;
  secondaryButtonColor?: string;
  secondaryButtonTextColor?: string;
  quoteBackgroundColor?: string;
  quoteBorderColor?: string;
  quoteTextColor?: string;
  referenceBackgroundColor?: string;
  referenceBorderColor?: string;
  referenceTextColor?: string;
  tableHeaderBackgroundColor?: string;
  tableHeaderTextColor?: string;
  tableBorderColor?: string;
  tableStripedColor?: string;
  dividerColor?: string;
}

// デフォルトテーマ（Cobiレイアウト）
export const defaultTheme: Theme = {
  layoutTheme: 'cobi',
  
  // メニュー設定
  menuSettings: {
    topLabel: 'トップ',
    articlesLabel: '記事一覧',
    searchLabel: '検索',
    customMenus: [
      { label: '', url: '' },
      { label: '', url: '' },
      { label: '', url: '' },
      { label: '', url: '' },
      { label: '', url: '' },
    ],
  },
  
  // 基本カラー
  primaryColor: '#3b82f6',          // blue-500（メインカラー）
  secondaryColor: '#6b7280',        // gray-500（サブカラー）
  accentColor: '#8b5cf6',           // purple-500（アクセントカラー）
  
  // 背景色
  backgroundColor: '#f9fafb',       // gray-50（全体背景）
  headerBackgroundColor: '#ffffff', // white（ヘッダー背景）
  footerBackgroundColor: '#1f2937', // gray-800（フッター背景）
  blockBackgroundColor: '#ffffff',  // white（ブロック背景）
  menuBackgroundColor: '#1f2937',   // gray-800（メニュー背景）
  menuTextColor: '#ffffff',         // white（メニューテキスト）
  
  // テキスト・リンク
  linkColor: '#2563eb',             // blue-600（リンクカラー）
  linkHoverColor: '#1d4ed8',        // blue-700（リンクホバーカラー）
  
  // 装飾
  borderColor: '#e5e7eb',           // gray-200（ボーダーカラー）
  shadowColor: 'rgba(0, 0, 0, 0.1)', // シャドウカラー
  
  // カスタムCSS
  customCss: '',
};

