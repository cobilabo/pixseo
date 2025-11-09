export interface TableOfContentsItem {
  id: string;
  level: number;  // 2, 3, 4 (H2, H3, H4)
  text: string;
}

export interface Article {
  id: string;
  mediaId: string;           // 所属メディアID
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  publishedAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string;        // 後方互換性のため残す
  writerId?: string;         // ライターID（新規）
  categoryIds: string[];
  tagIds: string[];
  featuredImage?: string;
  isPublished: boolean;
  isFeatured?: boolean;
  viewCount: number;
  likeCount: number;
  // SEO
  metaTitle?: string;
  metaDescription?: string;
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
}

export interface Category {
  id: string;
  mediaId: string;           // 所属メディアID
  name: string;
  slug: string;
  description?: string;
  isRecommended?: boolean;
  order?: number;
}

export interface Tag {
  id: string;
  mediaId: string;           // 所属メディアID
  name: string;
  slug: string;
  searchCount?: number;
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


