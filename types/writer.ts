export interface Writer {
  id: string;
  icon?: string; // アイコン画像（オプショナル）
  iconAlt?: string; // アイコン画像のalt属性
  backgroundImage?: string; // 背景画像（オプショナル）
  backgroundImageAlt?: string; // 背景画像のalt属性
  handleName: string; // ハンドルネーム
  bio?: string; // 紹介文（オプショナル）
  mediaId: string; // サービスID
  createdAt?: Date;
  updatedAt?: Date;
}

