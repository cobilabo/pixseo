export interface Client {
  id: string;
  logoUrl: string; // 正方形のロゴ
  email: string;
  clientName: string; // クライアント名
  contactPerson: string; // 担当者
  address: string; // 所在地
  uid: string; // Firebase AuthenticationのUID
  createdAt: Date;
  updatedAt: Date;
}

