export interface TableOfContentsItem {
  id: string;
  level: number;  // 2, 3, 4 (H2, H3, H4)
  text: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Article {
  id: string;
  mediaId: string;           // 所属メディアID
  // 後方互換性のため既存フィールドを保持（日本語のエイリアス）
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  createdAt?: Date;          // 作成日時（後方互換性のためオプショナル）
  publishedAt: Date;         // 公開日時（初回作成時の日時として使用される場合もある）
  updatedAt: Date;
  writerId: string;          // ライターID（必須・カテゴリー/タグと同じ設計）
  categoryIds: string[];
  tagIds: string[];
  featuredImage?: string;
  featuredImageAlt?: string; // アイキャッチ画像のalt属性
  isPublished: boolean;
  isFeatured?: boolean;
  viewCount: number;
  likeCount: number;
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
  // AIサマリー（AIO対策）
  aiSummary_ja?: string;
  aiSummary_en?: string;
  aiSummary_zh?: string;
  aiSummary_ko?: string;
  // 多言語FAQ
  faqs_ja?: FAQItem[];
  faqs_en?: FAQItem[];
  faqs_zh?: FAQItem[];
  faqs_ko?: FAQItem[];
  // 認証店関連
  isVerifiedLocation?: boolean;
  verifiedLocationId?: string;
  reservationUrl?: string;
  // Google Maps
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  // コンテンツ拡張
  tableOfContents?: TableOfContentsItem[];  // 目次
  relatedArticleIds?: string[];              // 関連記事ID
  readingTime?: number;                      // 読了時間（分）
  faqs?: FAQItem[];                          // FAQ（既存・後方互換性）
}

export interface Category {
  id: string;
  mediaId: string;           // 所属メディアID
  // 後方互換性のため既存フィールドを保持
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;         // カテゴリー画像
  imageAlt?: string;         // 画像のalt属性
  isRecommended?: boolean;
  order?: number;
  // 多言語フィールド
  name_ja?: string;
  name_en?: string;
  name_zh?: string;
  name_ko?: string;
  description_ja?: string;
  description_en?: string;
  description_zh?: string;
  description_ko?: string;
}

export interface Tag {
  id: string;
  mediaId: string;           // 所属メディアID
  // 後方互換性のため既存フィールドを保持
  name: string;
  slug: string;
  searchCount?: number;
  // 多言語フィールド
  name_ja?: string;
  name_en?: string;
  name_zh?: string;
  name_ko?: string;
}

export interface RelatedArticle {
  id: string;
  title: string;
  excerpt?: string;
  featuredImage?: string;
  slug: string;
  publishedAt: Date;
  mediaId: string;
}


