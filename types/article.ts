export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  publishedAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string;
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
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isRecommended?: boolean;
  order?: number;
}

export interface Tag {
  id: string;
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
}


