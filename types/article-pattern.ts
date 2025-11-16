/**
 * 記事構成パターン
 * レビュー形式、まとめ形式、疑問形式、導入→課題→解決策など
 */
export interface ArticlePattern {
  id: string;
  name: string; // パターン名（例: レビュー形式、まとめ形式）
  description: string; // パターンの説明
  prompt: string; // Grok APIに渡すプロンプト文
  mediaId: string; // メディアID
  createdAt: Date;
  updatedAt: Date;
}

export type ArticlePatternInput = Omit<ArticlePattern, 'id' | 'createdAt' | 'updatedAt'>;

