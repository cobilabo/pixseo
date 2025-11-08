export type UserRole = 'admin' | 'super_admin';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  mediaIds?: string[]; // 管理できるメディアテナントのID
  createdAt: Date;
  updatedAt: Date;
}

