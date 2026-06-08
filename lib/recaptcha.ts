import type { GeneralSettings } from '@/types/theme';

export interface RecaptchaPublicConfig {
  enabled: true;
  siteKey: string;
}

export interface RecaptchaServerConfig {
  enabled: boolean;
  siteKey?: string;
  secretKey?: string;
}

export interface RecaptchaVerifyResult {
  success: boolean;
  score?: number;
  action?: string;
  errorCodes?: string[];
}

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const MIN_SCORE = 0.5;

export function getRecaptchaServerConfig(
  generalSettings?: GeneralSettings | null
): RecaptchaServerConfig {
  const siteKey = generalSettings?.recaptchaSiteKey?.trim() || '';
  const secretKey = generalSettings?.recaptchaSecretKey?.trim() || '';
  const enabled =
    !!generalSettings?.recaptchaEnabled && siteKey.length > 0 && secretKey.length > 0;

  return {
    enabled,
    siteKey: siteKey || undefined,
    secretKey: secretKey || undefined,
  };
}

export function getPublicRecaptchaConfig(
  generalSettings?: GeneralSettings | null
): RecaptchaPublicConfig | undefined {
  const { enabled, siteKey } = getRecaptchaServerConfig(generalSettings);
  if (!enabled || !siteKey) return undefined;
  return { enabled: true, siteKey };
}

export async function verifyRecaptchaToken(
  token: string,
  secretKey: string,
  remoteIp?: string | null
): Promise<RecaptchaVerifyResult> {
  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });
  if (remoteIp) params.set('remoteip', remoteIp);

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    return { success: false, errorCodes: [`http_${response.status}`] };
  }

  const data = (await response.json()) as {
    success?: boolean;
    score?: number;
    action?: string;
    'error-codes'?: string[];
  };

  return {
    success: !!data.success,
    score: typeof data.score === 'number' ? data.score : undefined,
    action: data.action,
    errorCodes: data['error-codes'],
  };
}

export function isRecaptchaVerificationPassed(result: RecaptchaVerifyResult): boolean {
  if (!result.success) return false;
  if (result.score === undefined) return true;
  return result.score >= MIN_SCORE;
}