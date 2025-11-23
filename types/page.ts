import { Block } from './block';

export interface Page {
  id: string;
  mediaId: string;           // 所属メディアID
  // 後方互換性のため既存フィールドを保持
  title: string;
  content: string;           // HTML形式（後方互換性のため保持）
  excerpt?: string;
  slug: string;
  publishedAt: Date;
  updatedAt: Date;
  featuredImage?: string;
  featuredImageAlt?: string; // アイキャッチ画像のalt属性
  isPublished: boolean;
  // SEO（既存）
  metaTitle?: string;
  metaDescription?: string;
  // 多言語フィールド
  title_ja?: string;
  title_en?: string;
  title_zh?: string;
  title_ko?: string;
  content_ja?: string;
  content_en?: string;
  content_zh?: string;
  content_ko?: string;
  excerpt_ja?: string;
  excerpt_en?: string;
  excerpt_zh?: string;
  excerpt_ko?: string;
  metaTitle_ja?: string;
  metaTitle_en?: string;
  metaTitle_zh?: string;
  metaTitle_ko?: string;
  metaDescription_ja?: string;
  metaDescription_en?: string;
  metaDescription_zh?: string;
  metaDescription_ko?: string;
  // 固定ページ専用
  parentId?: string;         // 親ページID（階層構造用）
  order: number;             // 表示順
  
  // ブロックビルダー（新機能）
  blocks?: Block[];          // ブロックの配列
  useBlockBuilder?: boolean; // ブロックビルダーを使用するか（後方互換性のため）
  
  // ページスタイル設定
  backgroundColor?: string;  // ページ背景色
  textColor?: string;        // ページテキストカラー
}

