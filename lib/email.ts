import type { Lang } from '@/types/lang';

const RESEND_API_BASE = 'https://api.resend.com';

interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

const EMAIL_STRINGS: Record<string, Record<Lang, string>> = {
  submissionContent: {
    ja: '送信内容',
    en: 'Submission Details',
    zh: '提交内容',
    ko: '제출 내용',
  },
  autoFooter: {
    ja: 'このメールは自動送信されています。このメールに返信されてもお答えできない場合がございます。',
    en: 'This is an automated email. We may not be able to respond if you reply to this email.',
    zh: '此邮件为自动发送。如果您回复此邮件，我们可能无法回复。',
    ko: '이 메일은 자동 발송되었습니다. 이 메일에 답장하셔도 답변드리지 못할 수 있습니다.',
  },
  adminHeader: {
    ja: '新しいフォーム送信',
    en: 'New Form Submission',
    zh: '新表单提交',
    ko: '새로운 양식 제출',
  },
  adminFooter: {
    ja: 'このメールはフォーム送信により自動送信されています。',
    en: 'This email was automatically sent upon form submission.',
    zh: '此邮件因表单提交而自动发送。',
    ko: '이 메일은 양식 제출에 의해 자동으로 발송되었습니다.',
  },
  defaultAutoBody: {
    ja: 'この度はお問い合わせいただき、誠にありがとうございます。\n以下の内容で受け付けました。担当者より改めてご連絡いたします。',
    en: 'Thank you for your inquiry.\nWe have received your submission as detailed below. A representative will contact you shortly.',
    zh: '感谢您的咨询。\n我们已收到以下内容。负责人将尽快与您联系。',
    ko: '문의해 주셔서 감사합니다.\n아래 내용으로 접수되었습니다. 담당자가 다시 연락드리겠습니다.',
  },
  defaultAutoSubject: {
    ja: 'お問い合わせありがとうございます',
    en: 'Thank you for your inquiry',
    zh: '感谢您的咨询',
    ko: '문의해 주셔서 감사합니다',
  },
};

function emailStr(key: string, lang: Lang): string {
  return EMAIL_STRINGS[key]?.[lang] || EMAIL_STRINGS[key]?.ja || '';
}

/**
 * Resend APIでメールを送信
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY is not configured');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Email] Resend API error:', JSON.stringify(data), 'from:', options.from, 'to:', options.to);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    console.log('[Email] Sent successfully, id:', data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 管理者通知メールのHTML本文を生成
 */
export function buildAdminNotificationHtml(
  formName: string,
  submissionData: Record<string, any>,
  fields: { id: string; label: string; type: string }[]
): string {
  const fieldRows = fields
    .filter(f => !['display-text', 'display-image', 'display-html'].includes(f.type))
    .map(f => {
      const value = submissionData[f.id];
      const displayValue = Array.isArray(value) ? value.join(', ') : (value ?? '');
      return `<tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;white-space:nowrap;vertical-align:top;width:30%">${f.label}</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;white-space:pre-wrap">${escapeHtml(String(displayValue))}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:'Helvetica Neue',Arial,sans-serif;color:#333;background:#f5f5f5">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#2563eb;color:#fff;padding:20px 24px">
      <h1 style="margin:0;font-size:18px">${emailStr('adminHeader', 'ja')}</h1>
      <p style="margin:6px 0 0;font-size:14px;opacity:0.9">${escapeHtml(formName)}</p>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${fieldRows}
      </table>
      <p style="margin-top:20px;font-size:12px;color:#999">${emailStr('adminFooter', 'ja')}</p>
    </div>
  </div>
</body>
</html>`;
}

interface AutoReplyOptions {
  customBody?: string;
  formName: string;
  submissionData: Record<string, any>;
  fields: { id: string; label: string; type: string }[];
  lang?: Lang;
}

/**
 * 自動返信メールのHTML本文を生成（多言語対応）
 */
export function buildAutoReplyHtml(options: AutoReplyOptions): string;
/** @deprecated 旧シグネチャ互換 */
export function buildAutoReplyHtml(
  customBody: string | undefined,
  formName: string,
  submissionData: Record<string, any>,
  fields: { id: string; label: string; type: string }[],
  lang?: Lang
): string;
export function buildAutoReplyHtml(
  optionsOrBody: AutoReplyOptions | string | undefined,
  formName?: string,
  submissionData?: Record<string, any>,
  fields?: { id: string; label: string; type: string }[],
  langArg?: Lang
): string {
  let customBody: string | undefined;
  let name: string;
  let data: Record<string, any>;
  let flds: { id: string; label: string; type: string }[];
  let lang: Lang;

  if (typeof optionsOrBody === 'object' && optionsOrBody !== null && 'formName' in optionsOrBody) {
    customBody = optionsOrBody.customBody;
    name = optionsOrBody.formName;
    data = optionsOrBody.submissionData;
    flds = optionsOrBody.fields;
    lang = optionsOrBody.lang || 'ja';
  } else {
    customBody = optionsOrBody as string | undefined;
    name = formName!;
    data = submissionData!;
    flds = fields!;
    lang = langArg || 'ja';
  }

  const bodyText = customBody || emailStr('defaultAutoBody', lang);

  const fieldRows = flds
    .filter(f => !['display-text', 'display-image', 'display-html'].includes(f.type))
    .map(f => {
      const value = data[f.id];
      const displayValue = Array.isArray(value) ? value.join(', ') : (value ?? '');
      return `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;white-space:nowrap;vertical-align:top;width:30%">${escapeHtml(f.label)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;white-space:pre-wrap">${escapeHtml(String(displayValue))}</td>
      </tr>`;
    })
    .join('');

  const bodyHtml = escapeHtml(bodyText).replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:'Helvetica Neue',Arial,sans-serif;color:#333;background:#f5f5f5">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="padding:24px">
      <p style="font-size:14px;line-height:1.8">${bodyHtml}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <h3 style="font-size:14px;color:#666;margin:0 0 12px">${emailStr('submissionContent', lang)}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${fieldRows}
      </table>
      <p style="margin-top:24px;font-size:12px;color:#999">${emailStr('autoFooter', lang)}</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
