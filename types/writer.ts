export interface Writer {
  id: string;
  slug?: string; // スラッグ（URL用、英字）
  icon?: string; // アイコン画像（オプショナル）
  iconAlt?: string; // アイコン画像のalt属性
  backgroundImage?: string; // 背景画像（オプショナル）
  backgroundImageAlt?: string; // 背景画像のalt属性
  // 後方互換性のため既存フィールドを保持
  handleName: string; // ハンドルネーム
  bio?: string; // 紹介文（オプショナル）
  mediaId: string; // サービスID
  createdAt?: Date;
  updatedAt?: Date;
  // 多言語フィールド
  handleName_ja?: string;
  handleName_en?: string;
  handleName_zh?: string;
  handleName_ko?: string;
  bio_ja?: string;
  bio_en?: string;
  bio_zh?: string;
  bio_ko?: string;
}

