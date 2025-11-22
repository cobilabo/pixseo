/**
 * 定期記事生成設定
 * 指定されたスケジュールで自動的に記事を生成
 */
export interface ScheduledGeneration {
  id: string;
  name: string; // 設定名（例: 毎週月曜のAI記事）
  categoryId: string; // カテゴリーID
  patternId: string; // 構成パターンID
  writerId: string; // ライターID
  imagePromptPatternId: string; // 画像プロンプトパターンID
  targetAudience: string; // 想定読者（ペルソナ）
  
  // スケジュール設定
  daysOfWeek: string[]; // 曜日（0=日曜, 1=月曜, ..., 6=土曜）
  timeOfDay: string; // 時刻（HH:mm形式、例: "09:00"）
  timezone: string; // タイムゾーン（例: "Asia/Tokyo"）
  
  // 実行制御
  isActive: boolean; // 有効/無効
  lastExecutedAt?: Date; // 最終実行日時
  nextExecutionAt?: Date; // 次回実行予定日時
  
  mediaId: string; // メディアID
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduledGenerationInput = Omit<ScheduledGeneration, 'id' | 'createdAt' | 'updatedAt' | 'lastExecutedAt' | 'nextExecutionAt'>;

