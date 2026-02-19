import { FormField } from './block';

/**
 * フォーム定義
 */
export interface Form {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  isActive: boolean;
  submissionCount?: number;
  mediaId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // メール通知設定（管理者向け）
  emailNotification?: {
    enabled: boolean;
    to: string[];
    subject?: string;
  };
  
  // 自動返信メール設定（送信者向け）
  autoReply?: {
    enabled: boolean;
    fromEmail: string;
    fromName?: string;
    subject?: string;
    body?: string;
  };
  
  // 送信後の設定
  afterSubmit?: {
    type: 'message' | 'redirect';
    message?: string;
    redirectUrl?: string;
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

