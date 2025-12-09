import { Theme } from './theme';

// DNSレコード設定
export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX';
  host: string;              // @ または サブドメイン名
  value: string;             // レコード値
  priority?: number;         // MXレコード用
  purpose: 'web' | 'email';  // 用途
  verified: boolean;         // 検証済みかどうか
  verifiedAt?: Date;
}

// カスタムドメイン設定
export interface DomainConfig {
  type: 'root' | 'subdomain';           // ドメインタイプ
  
  // Vercel設定
  vercelDomainId?: string;              // Vercel側のドメインID
  vercelVerified: boolean;              // Vercelでの検証状態
  vercelConfigured: boolean;            // Vercelに追加済みか
  
  // メール設定（Resend）
  emailEnabled: boolean;                // メール機能有効化
  emailDomainId?: string;               // Resend側のドメインID
  emailVerified: boolean;               // メールドメイン検証状態
  
  // DNS設定状況
  dnsRecords: DnsRecord[];
  
  // ステータス
  status: 'pending' | 'verifying' | 'active' | 'error';
  errorMessage?: string;
  
  lastCheckedAt?: Date;
  configuredAt?: Date;
}

export interface MediaTenant {
  id: string;
  name: string;              // サービス名（例：「旅行メディアABC」）
  slug: string;              // URLスラッグ＝サブドメイン（例：「travel-abc」）
  customDomain?: string;     // カスタムドメイン（例：「travel-abc.com」）
  domainConfig?: DomainConfig; // カスタムドメイン詳細設定
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
  theme?: Theme;             // デザインテーマ設定
  isActive: boolean;
  allowIndexing: boolean;    // SEOインデックス許可（デフォルト：false）
  createdAt: Date;
  updatedAt: Date;
}
