export type HeadingStyle = 'default' | 'border-left' | 'border-bottom' | 'background' | 'rounded';

export interface Theme {
  // レイアウトテーマ
  layoutTheme: 'theme1'; // 将来的に theme2, theme3 などを追加可能
  
  // 背景色
  backgroundColor: string;          // 全体背景色
  headerBackgroundColor: string;    // ヘッダー背景色
  footerBackgroundColor: string;    // フッター背景色
  panelBackgroundColor: string;     // パネル（カード）背景色
  
  // 見出しデザイン
  h2Style: HeadingStyle;
  h2Color: string;
  h2BackgroundColor?: string;
  h2BorderColor?: string;
  
  h3Style: HeadingStyle;
  h3Color: string;
  h3BackgroundColor?: string;
  h3BorderColor?: string;
  
  h4Style: HeadingStyle;
  h4Color: string;
  h4BackgroundColor?: string;
  h4BorderColor?: string;
  
  // テキスト
  textColor: string;                // 本文テキストカラー
  linkColor: string;                // リンクカラー
  linkHoverColor: string;           // リンクホバーカラー
  
  // ボタン
  primaryButtonColor: string;       // ボタンカラー1（背景）
  primaryButtonTextColor: string;   // ボタンカラー1（テキスト）
  secondaryButtonColor: string;     // ボタンカラー2（背景）
  secondaryButtonTextColor: string; // ボタンカラー2（テキスト）
  
  // 引用・参照
  quoteBackgroundColor: string;     // 引用背景色
  quoteBorderColor: string;         // 引用ボーダー色
  quoteTextColor: string;           // 引用テキスト色
  
  referenceBackgroundColor: string; // 参照背景色
  referenceBorderColor: string;     // 参照ボーダー色
  referenceTextColor: string;       // 参照テキスト色
  
  // 表（テーブル）
  tableHeaderBackgroundColor: string; // 表ヘッダー背景色
  tableHeaderTextColor: string;       // 表ヘッダーテキスト色
  tableBorderColor: string;           // 表ボーダー色
  tableStripedColor: string;          // 表ストライプ背景色（奇数行）
  
  // その他
  borderColor: string;              // 汎用ボーダー色
  dividerColor: string;             // 区切り線色
  shadowColor: string;              // シャドウ色
}

// デフォルトテーマ（レイアウトテーマ1）
export const defaultTheme: Theme = {
  layoutTheme: 'theme1',
  
  // 背景色
  backgroundColor: '#f9fafb',       // gray-50
  headerBackgroundColor: '#ffffff', // white
  footerBackgroundColor: '#1f2937', // gray-800
  panelBackgroundColor: '#ffffff',  // white
  
  // H2
  h2Style: 'border-left',
  h2Color: '#111827',               // gray-900
  h2BackgroundColor: '#f3f4f6',    // gray-100
  h2BorderColor: '#3b82f6',         // blue-500
  
  // H3
  h3Style: 'border-bottom',
  h3Color: '#1f2937',               // gray-800
  h3BackgroundColor: '#ffffff',
  h3BorderColor: '#9ca3af',         // gray-400
  
  // H4
  h4Style: 'default',
  h4Color: '#374151',               // gray-700
  h4BackgroundColor: '#ffffff',
  h4BorderColor: '#d1d5db',         // gray-300
  
  // テキスト
  textColor: '#374151',             // gray-700
  linkColor: '#2563eb',             // blue-600
  linkHoverColor: '#1d4ed8',        // blue-700
  
  // ボタン
  primaryButtonColor: '#3b82f6',    // blue-500
  primaryButtonTextColor: '#ffffff',
  secondaryButtonColor: '#6b7280',  // gray-500
  secondaryButtonTextColor: '#ffffff',
  
  // 引用
  quoteBackgroundColor: '#f3f4f6',  // gray-100
  quoteBorderColor: '#9ca3af',      // gray-400
  quoteTextColor: '#4b5563',        // gray-600
  
  // 参照
  referenceBackgroundColor: '#eff6ff', // blue-50
  referenceBorderColor: '#3b82f6',     // blue-500
  referenceTextColor: '#1e40af',       // blue-800
  
  // 表
  tableHeaderBackgroundColor: '#f3f4f6', // gray-100
  tableHeaderTextColor: '#111827',       // gray-900
  tableBorderColor: '#d1d5db',           // gray-300
  tableStripedColor: '#f9fafb',          // gray-50
  
  // その他
  borderColor: '#e5e7eb',           // gray-200
  dividerColor: '#d1d5db',          // gray-300
  shadowColor: 'rgba(0, 0, 0, 0.1)',
};

