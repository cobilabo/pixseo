import { FormField } from './block';

/**
 * フォーム定義
 */
export interface Form {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  isActive: boolean; // 公開/非公開
  submissionCount?: number; // 送信回数
  mediaId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // メール通知設定
  emailNotification?: {
    enabled: boolean;
    to: string[]; // 通知先メールアドレス
    subject?: string; // 件名テンプレート
  };
  
  // 送信後の設定
  afterSubmit?: {
    type: 'message' | 'redirect'; // メッセージ表示 or リダイレクト
    message?: string; // メッセージ（type='message'の場合）
    redirectUrl?: string; // リダイレクト先URL（type='redirect'の場合）
  };
}

/**
 * フォーム送信データ
 */
export interface FormSubmission {
  id: string;
  formId: string;
  formName?: string; // 参照用
  data: Record<string, any>; // フィールドID → 値のマップ
  submittedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  mediaId: string;
}

export type FormInput = Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'submissionCount'>;

