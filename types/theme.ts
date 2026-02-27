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

// メニュー項目の定義（従来形式 - 後方互換性のため保持）
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

// ナビゲーション項目タイプの定義
export type NavigationItemType = 'top' | 'search' | 'page' | 'category';

// ナビゲーション項目の定義（新形式）
export interface NavigationItem {
  id: string;                 // 一意のID
  type: NavigationItemType;   // 項目タイプ
  label: string;              // 表示ラベル
  pageId?: string;            // 固定ページID（type='page'の場合）
  pageSlug?: string;          // 固定ページスラッグ（type='page'の場合）
  categoryId?: string;        // カテゴリーID（type='category'の場合）
  categorySlug?: string;      // カテゴリースラッグ（type='category'の場合）
  // 多言語フィールド
  label_ja?: string;
  label_en?: string;
  label_zh?: string;
  label_ko?: string;
}

// グローバルメニューのホバーエフェクト
export type GlobalMenuHoverEffect = 'grayscale' | 'darken' | 'zoom' | 'none';

// グローバルメニューのデザイン設定
export interface GlobalMenuDesign {
  height: number;
  paddingTop: number;
  borderRadius: number;
  overlayOpacity: number;
  defaultGradientFrom: string;
  defaultGradientTo: string;
  labelColor: string;
  labelFontSize: string;
  labelFontWeight: string;
  hoverEffect: GlobalMenuHoverEffect;
  gap: number;
  showInitialChar: boolean;
}

// メニュー設定の定義
export interface MenuSettings {
  // 新形式: ハンバーガーメニューのナビゲーション項目配列
  navigationItems?: NavigationItem[];
  
  // グローバルメニュー（ヘッダー表示用）のナビゲーション項目配列
  globalNavItems?: NavigationItem[];
  
  // グローバルメニューデザイン設定
  globalMenuDesign?: GlobalMenuDesign;
  
  // 後方互換性のため既存フィールドを保持
  topLabel: string;           // トップ
  articlesLabel: string;      // 記事一覧
  searchLabel: string;        // 検索
  customMenus: MenuItem[];    // 追加メニュー1-5
}

// SNS設定の定義
export interface SnsSettings {
  xUserId?: string;           // X（Twitter）のユーザーID
}

// 検索表示対象ページの定義
export interface SearchDisplayPages {
  topPage: boolean;           // TOPページ
  staticPages: boolean;       // 固定ページ
  articlePages: boolean;      // 記事ページ
  sidebar: boolean;           // サイドコンテンツ内
}

// 検索の種類（チェックボックス形式）
export interface SearchTypes {
  keywordSearch: boolean;      // キーワード検索
  tagSearch: boolean;          // タグ検索（プルダウン）
  categorySearch: boolean;     // カテゴリー検索
  popularTags: boolean;        // よく検索されているタグ
}

// カテゴリー検索の表示形式
export type CategorySearchDisplayType = 'dropdown' | 'list';

// 検索項目のキー
export type SearchTypeKey = 'keywordSearch' | 'tagSearch' | 'categorySearch' | 'popularTags';

// よく検索されているタグの設定
export interface PopularTagsSettings {
  displayCount: number;        // 表示件数（デフォルト: 10）
}

// 検索設定の定義（ふらっとテーマ専用）
export interface SearchSettings {
  displayPages: SearchDisplayPages;    // 表示対象ページ
  searchTypes: SearchTypes;            // 検索の種類
  searchOrder?: SearchTypeKey[];       // 検索項目の表示順
  categorySearchDisplayType?: CategorySearchDisplayType; // カテゴリー検索の表示形式
  popularTagsSettings: PopularTagsSettings;  // よく検索されているタグの設定
  // 後方互換性のため残す（廃止予定）
  searchBoxType?: 'keyword' | 'tag' | 'both';
}

// サイドコンテンツ項目タイプの定義
export type SideContentItemType = 
  | 'recentArticles'      // 新着記事
  | 'popularArticles'     // 人気記事
  | 'recommendedArticles' // おすすめ記事
  | 'categories'          // カテゴリー一覧
  | 'html';               // HTMLコード

// サイドコンテンツ項目の定義（統合型）
export interface SideContentItem {
  id: string;                       // 一意のID
  type: SideContentItemType;        // 項目タイプ
  isEnabled: boolean;               // 有効/無効
  order: number;                    // 表示順
  // 人気記事・おすすめ記事用
  displayCount?: number;            // 表示件数
  // HTML用
  title?: string;                   // 管理用タイトル
  htmlCode?: string;                // HTMLコード
}

// サイドコンテンツHTMLアイテムの定義（ふらっとテーマ専用）※後方互換性のため保持
export interface SideContentHtmlItem {
  id: string;                 // 一意のID
  title: string;              // 管理用タイトル
  htmlCode: string;           // HTMLコード
  isEnabled: boolean;         // 有効/無効
  order: number;              // 表示順
}

// HTMLショートコードの定義（ふらっとテーマ専用）
export interface HtmlShortcodeItem {
  id: string;                 // 一意のID
  label: string;              // 識別用ラベル（プルダウン表示用）
  htmlCode: string;           // HTMLコード
}

// 内部リンク表示形式
export type InternalLinkStyle = 'text' | 'blogcard';

// 記事設定の定義
export interface ArticleSettings {
  internalLinkStyle: InternalLinkStyle;  // 内部記事リンクの表示形式
}

// スクリプト発火条件の定義
export type ScriptTriggerType = 
  | 'all'           // サイト全体
  | 'home'          // トップページのみ
  | 'articles'      // 記事ページ全体
  | 'categories'    // カテゴリーページ全体
  | 'tags'          // タグページ全体
  | 'pages'         // 固定ページ全体
  | 'search'        // 検索ページ
  | 'custom';       // カスタムパス指定

export interface ScriptTrigger {
  type: ScriptTriggerType;
  customPaths?: string[];     // カスタムパス指定時のパス（複数可、ワイルドカード対応）
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
  triggers: ScriptTrigger[];                       // 発火条件（複数設定可、OR条件で評価）
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

// テーマごとの設定（レイアウトテーマ別に保持）
export interface ThemeLayoutSettings {
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
  
  // 検索設定（ふらっとテーマ専用）
  searchSettings?: SearchSettings;
  
  // サイドコンテンツHTML（ふらっとテーマ専用）※後方互換性のため保持
  sideContentHtmlItems?: SideContentHtmlItem[];
  
  // サイドコンテンツ項目（ふらっとテーマ専用）※新形式
  sideContentItems?: SideContentItem[];
  
  // HTMLショートコード（ふらっとテーマ専用）
  htmlShortcodes?: HtmlShortcodeItem[];
  
  // 記事設定
  articleSettings?: ArticleSettings;
  
  // 基本カラー
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  
  // 背景色
  backgroundColor?: string;
  headerBackgroundColor?: string;
  footerBackgroundColor?: string;
  blockBackgroundColor?: string;
  menuBackgroundColor?: string;
  menuTextColor?: string;
  
  // テキスト・リンク
  linkColor?: string;
  linkHoverColor?: string;
  
  // 装飾
  borderColor?: string;
  shadowColor?: string;
  
  // カスタムCSS
  customCss?: string;
  
  // カスタムJavaScript
  scripts?: ScriptItem[];
}

export interface Theme {
  // レイアウトテーマ
  layoutTheme: ThemeLayoutId; // 'cobi' | 'furatto'
  
  // テーマごとの設定を保持（キーはThemeLayoutId）
  themeSettings?: {
    [key: string]: ThemeLayoutSettings;
  };
  
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
  
  // 検索設定（ふらっとテーマ専用）
  searchSettings?: SearchSettings;
  
  // サイドコンテンツHTML（ふらっとテーマ専用）※後方互換性のため保持
  sideContentHtmlItems?: SideContentHtmlItem[];
  
  // サイドコンテンツ項目（ふらっとテーマ専用）※新形式
  sideContentItems?: SideContentItem[];
  
  // HTMLショートコード（ふらっとテーマ専用）
  htmlShortcodes?: HtmlShortcodeItem[];
  
  // 記事設定
  articleSettings?: ArticleSettings;
  
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
  
  // 検索設定（デフォルト）
  searchSettings: {
    displayPages: {
      topPage: false,
      staticPages: false,
      articlePages: false,
      sidebar: true,
    },
    searchTypes: {
      keywordSearch: true,
      tagSearch: false,
      categorySearch: false,
      popularTags: false,
    },
    popularTagsSettings: {
      displayCount: 10,
    },
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

