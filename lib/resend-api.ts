/**
 * Resend API クライアント
 * メール送信用ドメインの追加・削除・検証を行う
 */

const RESEND_API_BASE = 'https://api.resend.com';

interface ResendDomainResponse {
  id: string;
  name: string;
  status: 'pending' | 'verified' | 'failed';
  created_at: string;
  region: string;
  records: ResendDnsRecord[];
}

interface ResendDnsRecord {
  record: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
  name: string;
  type: 'TXT' | 'CNAME' | 'MX';
  ttl: string;
  status: 'pending' | 'verified' | 'failed';
  value: string;
  priority?: number;
}

interface ResendError {
  statusCode: number;
  message: string;
  name: string;
}

/**
 * Resend APIヘッダーを取得
 */
function getResendHeaders(): HeadersInit {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * ドメインをResendに追加（メール送信用）
 */
export async function addDomainToResend(domain: string): Promise<{
  success: boolean;
  domainId?: string;
  status?: string;
  records?: {
    type: 'TXT' | 'CNAME' | 'MX';
    host: string;
    value: string;
    priority?: number;
    recordType: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
  }[];
  error?: string;
}> {
  try {
    const response = await fetch(`${RESEND_API_BASE}/domains`, {
      method: 'POST',
      headers: getResendHeaders(),
      body: JSON.stringify({ name: domain }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const error = data as ResendError;
      // すでに追加済みの場合
      if (error.message?.includes('already exists')) {
        // 既存のドメイン情報を取得
        const existingDomain = await getDomainFromResend(domain);
        if (existingDomain.success) {
          return existingDomain;
        }
      }
      return {
        success: false,
        error: error.message || 'Failed to add domain to Resend',
      };
    }
    
    const result = data as ResendDomainResponse;
    return {
      success: true,
      domainId: result.id,
      status: result.status,
      records: result.records.map(r => ({
        type: r.type,
        host: r.name,
        value: r.value,
        priority: r.priority,
        recordType: r.record,
      })),
    };
  } catch (error) {
    console.error('[Resend API] Error adding domain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Resendからドメイン情報を取得
 */
export async function getDomainFromResend(domain: string): Promise<{
  success: boolean;
  domainId?: string;
  status?: string;
  records?: {
    type: 'TXT' | 'CNAME' | 'MX';
    host: string;
    value: string;
    priority?: number;
    recordType: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
    verified: boolean;
  }[];
  error?: string;
}> {
  try {
    // ドメイン一覧を取得
    const response = await fetch(`${RESEND_API_BASE}/domains`, {
      method: 'GET',
      headers: getResendHeaders(),
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch domains from Resend',
      };
    }
    
    const data = await response.json();
    const domains = data.data as ResendDomainResponse[];
    
    // 指定のドメインを検索
    const targetDomain = domains.find(d => d.name === domain);
    if (!targetDomain) {
      return {
        success: false,
        error: 'Domain not found in Resend',
      };
    }
    
    return {
      success: true,
      domainId: targetDomain.id,
      status: targetDomain.status,
      records: targetDomain.records.map(r => ({
        type: r.type,
        host: r.name,
        value: r.value,
        priority: r.priority,
        recordType: r.record,
        verified: r.status === 'verified',
      })),
    };
  } catch (error) {
    console.error('[Resend API] Error getting domain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ドメインをResendから削除
 */
export async function removeDomainFromResend(domainId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${RESEND_API_BASE}/domains/${domainId}`, {
      method: 'DELETE',
      headers: getResendHeaders(),
    });
    
    if (!response.ok) {
      const data = await response.json() as ResendError;
      return {
        success: false,
        error: data.message || 'Failed to remove domain from Resend',
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Resend API] Error removing domain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ドメインの検証を実行
 */
export async function verifyResendDomain(domainId: string): Promise<{
  success: boolean;
  status?: string;
  records?: {
    type: 'TXT' | 'CNAME' | 'MX';
    host: string;
    value: string;
    priority?: number;
    recordType: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
    verified: boolean;
  }[];
  error?: string;
}> {
  try {
    const response = await fetch(`${RESEND_API_BASE}/domains/${domainId}/verify`, {
      method: 'POST',
      headers: getResendHeaders(),
    });
    
    if (!response.ok) {
      const data = await response.json() as ResendError;
      return {
        success: false,
        error: data.message || 'Failed to verify domain',
      };
    }
    
    const data = await response.json() as ResendDomainResponse;
    return {
      success: true,
      status: data.status,
      records: data.records.map(r => ({
        type: r.type,
        host: r.name,
        value: r.value,
        priority: r.priority,
        recordType: r.record,
        verified: r.status === 'verified',
      })),
    };
  } catch (error) {
    console.error('[Resend API] Error verifying domain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * メール送信に必要なDNSレコードを生成
 * Resendから取得したレコード情報を使用
 */
export function generateEmailDnsRecords(resendRecords: {
  type: 'TXT' | 'CNAME' | 'MX';
  host: string;
  value: string;
  priority?: number;
  recordType: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
}[]): {
  type: 'TXT' | 'CNAME' | 'MX';
  host: string;
  value: string;
  priority?: number;
  purpose: 'email';
  description: string;
}[] {
  return resendRecords.map(r => ({
    type: r.type,
    host: r.host,
    value: r.value,
    priority: r.priority,
    purpose: 'email' as const,
    description: getRecordDescription(r.recordType),
  }));
}

/**
 * レコードタイプの説明を取得
 */
function getRecordDescription(recordType: 'SPF' | 'DKIM' | 'DMARC' | 'MX'): string {
  const descriptions: Record<string, string> = {
    'SPF': 'SPF（送信者認証）',
    'DKIM': 'DKIM（メール署名）',
    'DMARC': 'DMARC（メール認証ポリシー）',
    'MX': 'MX（メール受信）',
  };
  return descriptions[recordType] || recordType;
}

