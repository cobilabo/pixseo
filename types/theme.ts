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

export interface Theme {
  // レイアウトテーマ
  layoutTheme: ThemeLayoutId; // 'cobi' | 'furatto'
  
  // フッターブロック（最大4つ）
  footerBlocks?: FooterBlock[];
  
  // 基本カラー
  primaryColor: string;             // メインカラー
  secondaryColor: string;           // サブカラー
  accentColor: string;              // アクセントカラー
  
  // 背景色
  backgroundColor: string;          // 全体背景色
  headerBackgroundColor: string;    // ヘッダー背景色
  footerBackgroundColor: string;    // フッター背景色
  blockBackgroundColor: string;     // ブロック背景色
  
  // テキスト・リンク
  linkColor: string;                // リンクテキストカラー
  linkHoverColor: string;           // リンクホバーカラー
  
  // 装飾
  borderColor: string;              // ボーダーカラー
  shadowColor: string;              // シャドウカラー（RGBA形式）
  
  // 見出しデザイン（H2）
  h2Color: string;
  h2BackgroundColor?: string;
  h2LeftBorderColor?: string;
  h2BottomBorderColor?: string;
  h2Icon?: string;
  
  // 見出しデザイン（H3）
  h3Color: string;
  h3BackgroundColor?: string;
  h3LeftBorderColor?: string;
  h3BottomBorderColor?: string;
  h3Icon?: string;
  
  // 見出しデザイン（H4）
  h4Color: string;
  h4BackgroundColor?: string;
  h4LeftBorderColor?: string;
  h4BottomBorderColor?: string;
  h4Icon?: string;
  
  // カスタムCSS
  customCss?: string;               // 自由なCSS記述エリア
  
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
  
  // 基本カラー
  primaryColor: '#3b82f6',          // blue-500（メインカラー）
  secondaryColor: '#6b7280',        // gray-500（サブカラー）
  accentColor: '#8b5cf6',           // purple-500（アクセントカラー）
  
  // 背景色
  backgroundColor: '#f9fafb',       // gray-50（全体背景）
  headerBackgroundColor: '#ffffff', // white（ヘッダー背景）
  footerBackgroundColor: '#1f2937', // gray-800（フッター背景）
  blockBackgroundColor: '#ffffff',  // white（ブロック背景）
  
  // テキスト・リンク
  linkColor: '#2563eb',             // blue-600（リンクカラー）
  linkHoverColor: '#1d4ed8',        // blue-700（リンクホバーカラー）
  
  // 装飾
  borderColor: '#e5e7eb',           // gray-200（ボーダーカラー）
  shadowColor: 'rgba(0, 0, 0, 0.1)', // シャドウカラー
  
  // 見出しデザイン（H2）
  h2Color: '#111827',               // gray-900
  h2BackgroundColor: '#f3f4f6',     // gray-100
  h2LeftBorderColor: '#3b82f6',     // blue-500
  h2BottomBorderColor: 'transparent',
  h2Icon: '',
  
  // 見出しデザイン（H3）
  h3Color: '#1f2937',               // gray-800
  h3BackgroundColor: '#ffffff',
  h3LeftBorderColor: 'transparent',
  h3BottomBorderColor: '#9ca3af',   // gray-400
  h3Icon: '',
  
  // 見出しデザイン（H4）
  h4Color: '#374151',               // gray-700
  h4BackgroundColor: '#ffffff',
  h4LeftBorderColor: 'transparent',
  h4BottomBorderColor: 'transparent',
  h4Icon: '',
  
  // カスタムCSS
  customCss: '',
};

