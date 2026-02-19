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
      console.error('[Email] Resend API error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

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
      <h1 style="margin:0;font-size:18px">新しいフォーム送信</h1>
      <p style="margin:6px 0 0;font-size:14px;opacity:0.9">${escapeHtml(formName)}</p>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${fieldRows}
      </table>
      <p style="margin-top:20px;font-size:12px;color:#999">このメールはフォーム送信により自動送信されています。</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 自動返信メールのHTML本文を生成
 */
export function buildAutoReplyHtml(
  customBody: string | undefined,
  formName: string,
  submissionData: Record<string, any>,
  fields: { id: string; label: string; type: string }[]
): string {
  const bodyText = customBody || 'この度はお問い合わせいただき、誠にありがとうございます。\n以下の内容で受け付けました。担当者より改めてご連絡いたします。';

  const fieldRows = fields
    .filter(f => !['display-text', 'display-image', 'display-html'].includes(f.type))
    .map(f => {
      const value = submissionData[f.id];
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
      <h3 style="font-size:14px;color:#666;margin:0 0 12px">送信内容</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${fieldRows}
      </table>
      <p style="margin-top:24px;font-size:12px;color:#999">このメールは自動送信されています。このメールに返信されてもお答えできない場合がございます。</p>
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
