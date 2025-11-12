import { Article, Category, Tag } from '@/types/article';

export interface FirestoreArticle extends Omit<Article, 'publishedAt' | 'updatedAt'> {
  publishedAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface FirestoreCategory extends Category {}
export interface FirestoreTag extends Tag {}



