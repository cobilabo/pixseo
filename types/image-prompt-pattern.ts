/**
 * 画像プロンプトパターン
 * AI画像生成時のプロンプトパターン（ピクサー風のイラスト、文字無し、横長など）
 */
export interface ImagePromptPattern {
  id: string;
  name: string; // パターン名（例: ピクサー風イラスト、写真風）
  description: string; // パターンの説明
  prompt: string; // DALL-E 3に渡すプロンプトのベース
  size: '1024x1024' | '1792x1024' | '1024x1792'; // 画像サイズ
  mediaId: string; // メディアID
  createdAt: Date;
  updatedAt: Date;
}

export type ImagePromptPatternInput = Omit<ImagePromptPattern, 'id' | 'createdAt' | 'updatedAt'>;

