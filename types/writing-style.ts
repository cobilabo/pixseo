/**
 * ライティング特徴
 * ライター毎のライティングスタイル（ですます調、フランクな口調、記号多用など）
 */
export interface WritingStyle {
  id: string;
  writerId: string; // ライターID
  name: string; // スタイル名（例: ですます調、フランクな口調）
  description: string; // スタイルの説明
  prompt: string; // リライト時にGrok APIに渡すプロンプト文
  mediaId: string; // メディアID
  createdAt: Date;
  updatedAt: Date;
}

export type WritingStyleInput = Omit<WritingStyle, 'id' | 'createdAt' | 'updatedAt'>;

