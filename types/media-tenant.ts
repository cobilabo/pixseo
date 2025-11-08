export interface MediaTenant {
  id: string;
  name: string;              // サービス名（例：「旅行メディアABC」）
  slug: string;              // URLスラッグ＝サブドメイン（例：「travel-abc」）
  customDomain?: string;     // カスタムドメイン（例：「travel-abc.com」）※枠だけ
  ownerId: string;           // 所有者のUID
  memberIds: string[];       // メンバーのUID配列
  clientId?: string;         // 紐づくクライアントID
  settings: {
    siteDescription: string;
    logos: {
      landscape: string;     // 横長ロゴ
      square: string;        // 正方形ロゴ
      portrait: string;      // 縦長ロゴ
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
