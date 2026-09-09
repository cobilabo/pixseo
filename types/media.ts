export interface MediaFile {
  id: string;
  mediaId: string;           // 所属メディアID
  name: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  contentHash?: string;      // 保存バイト列の SHA-256（同一画像の再利用用）
  alt?: string;              // 画像のalt属性
  isAiGenerated?: boolean;   // AI生成画像かどうか
  aiPrompt?: string;         // AI生成時のプロンプト
  aiRevisedPrompt?: string;  // AI生成時の改訂プロンプト
  createdAt: Date;
  updatedAt: Date;
}

