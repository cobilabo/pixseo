export interface CustomBlock {
  id: string;
  mediaId: string;          // 所属メディアID（サービス単位）
  name: string;             // カスタムブロック名
  html: string;             // HTML コンテンツ
  css: string;              // CSS スタイル
  createdAt: Date;
  updatedAt: Date;
}
