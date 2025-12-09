/**
 * Vercel API クライアント
 * ドメインの追加・削除・検証を行う
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string;
  redirectStatusCode?: number;
  gitBranch?: string;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

interface VercelDomainConfig {
  configuredBy?: 'A' | 'CNAME' | null;
  acceptedChallenges?: string[];
  misconfigured: boolean;
}

interface VercelError {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Vercel APIヘッダーを取得
 */
function getVercelHeaders(): HeadersInit {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error('VERCEL_API_TOKEN is not configured');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Vercel プロジェクトIDを取得
 */
function getProjectId(): string {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID is not configured');
  }
  return projectId;
}

/**
 * Vercel チームIDを取得（オプション）
 */
function getTeamId(): string | undefined {
  return process.env.VERCEL_TEAM_ID;
}

/**
 * URLにチームIDを追加
 */
function appendTeamId(url: string): string {
  const teamId = getTeamId();
  if (teamId) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}teamId=${teamId}`;
  }
  return url;
}

/**
 * ドメインをVercelプロジェクトに追加
 */
export async function addDomainToVercel(domain: string): Promise<{
  success: boolean;
  domainId?: string;
  verified?: boolean;
  verification?: { type: string; domain: string; value: string }[];
  error?: string;
}> {
  try {
    const projectId = getProjectId();
    const url = appendTeamId(`${VERCEL_API_BASE}/v10/projects/${projectId}/domains`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getVercelHeaders(),
      body: JSON.stringify({ name: domain }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const error = data as VercelError;
      // すでに追加済みの場合は成功として扱う
      if (error.error?.code === 'domain_already_in_use') {
        return {
          success: true,
          verified: false,
          error: 'Domain already added to project',
        };
      }
      return {
        success: false,
        error: error.error?.message || 'Failed to add domain',
      };
    }
    
    const result = data as VercelDomainResponse;
    return {
      success: true,
      domainId: result.name,
      verified: result.verified,
      verification: result.verification?.map(v => ({
        type: v.type,
        domain: v.domain,
        value: v.value,
      })),
    };
  } catch (error) {
    console.error('[Vercel API] Error adding domain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ドメインをVercelプロジェクトから削除
 */
export async function removeDomainFromVercel(domain: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const projectId = getProjectId();
    const url = appendTeamId(`${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}`);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getVercelHeaders(),
    });
    
    if (!response.ok) {
      const data = await response.json() as VercelError;
      return {
        success: false,
        error: data.error?.message || 'Failed to remove domain',
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Vercel API] Error removing domain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ドメインの検証状態を確認
 */
export async function verifyDomain(domain: string): Promise<{
  success: boolean;
  verified?: boolean;
  configured?: boolean;
  configuredBy?: 'A' | 'CNAME' | null;
  error?: string;
}> {
  try {
    const projectId = getProjectId();
    const url = appendTeamId(`${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getVercelHeaders(),
    });
    
    if (!response.ok) {
      const data = await response.json() as VercelError;
      return {
        success: false,
        error: data.error?.message || 'Failed to verify domain',
      };
    }
    
    const data = await response.json() as VercelDomainResponse;
    
    // ドメイン設定状態を取得
    const configUrl = appendTeamId(`${VERCEL_API_BASE}/v6/domains/${domain}/config`);
    const configResponse = await fetch(configUrl, {
      method: 'GET',
      headers: getVercelHeaders(),
    });
    
    let configured = false;
    let configuredBy: 'A' | 'CNAME' | null = null;
    
    if (configResponse.ok) {
      const configData = await configResponse.json() as VercelDomainConfig;
      configured = !configData.misconfigured;
      configuredBy = configData.configuredBy || null;
    }
    
    return {
      success: true,
      verified: data.verified,
      configured,
      configuredBy,
    };
  } catch (error) {
    console.error('[Vercel API] Error verifying domain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ドメインがルートドメインかサブドメインかを判定
 */
export function getDomainType(domain: string): 'root' | 'subdomain' {
  const parts = domain.split('.');
  // example.com = 2 parts = root
  // blog.example.com = 3 parts = subdomain
  // co.jp の場合も考慮（example.co.jp = 3 parts だがルート）
  const tlds = ['co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp', 'com', 'net', 'org', 'io', 'dev'];
  
  // 末尾がco.jp等の場合
  if (parts.length >= 2) {
    const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (['co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp'].includes(lastTwo)) {
      return parts.length > 3 ? 'subdomain' : 'root';
    }
  }
  
  return parts.length > 2 ? 'subdomain' : 'root';
}

/**
 * ドメインに必要なDNSレコードを生成
 */
export function generateRequiredDnsRecords(domain: string): {
  type: 'A' | 'CNAME';
  host: string;
  value: string;
  purpose: 'web';
}[] {
  const domainType = getDomainType(domain);
  const records: { type: 'A' | 'CNAME'; host: string; value: string; purpose: 'web' }[] = [];
  
  if (domainType === 'root') {
    // ルートドメイン: Aレコード
    records.push({
      type: 'A',
      host: '@',
      value: '76.76.21.21',
      purpose: 'web',
    });
    // wwwサブドメイン用CNAME
    records.push({
      type: 'CNAME',
      host: 'www',
      value: 'cname.vercel-dns.com',
      purpose: 'web',
    });
  } else {
    // サブドメイン: CNAMEレコード
    const parts = domain.split('.');
    const subdomain = parts[0];
    records.push({
      type: 'CNAME',
      host: subdomain,
      value: 'cname.vercel-dns.com',
      purpose: 'web',
    });
  }
  
  return records;
}

