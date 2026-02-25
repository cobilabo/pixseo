import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, buildAdminNotificationHtml, buildAutoReplyHtml } from '@/lib/email';
import type { Lang } from '@/types/lang';

export const dynamic = 'force-dynamic';

const VALID_LANGS: Lang[] = ['ja', 'en', 'zh', 'ko'];

const DEFAULT_SUBJECT: Record<Lang, string> = {
  ja: 'お問い合わせありがとうございます',
  en: 'Thank you for your inquiry',
  zh: '感谢您的咨询',
  ko: '문의해 주셔서 감사합니다',
};

function resolveFromAddress(form: any): string {
  if (form.autoReply?.fromEmail) {
    const name = form.autoReply.fromName || form.name;
    return `${name} <${form.autoReply.fromEmail}>`;
  }
  return `${form.name} <onboarding@resend.dev>`;
}

/**
 * フォーム送信
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formId = params.id;
    
    const formDoc = await adminDb.collection('forms').doc(formId).get();

    if (!formDoc.exists) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const form = formDoc.data()!;

    if (!form.isActive) {
      return NextResponse.json(
        { error: 'Form is not active' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const submissionData = body.data || {};
    const lang: Lang = VALID_LANGS.includes(body.lang) ? body.lang : 'ja';

    const fields = form.fields || [];
    const missingFields: string[] = [];

    for (const field of fields) {
      if (field.required && !submissionData[field.id]) {
        missingFields.push(field.label);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      );
    }

    const submission = {
      formId,
      formName: form.name,
      data: submissionData,
      lang,
      submittedAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      mediaId: form.mediaId,
    };

    const submissionRef = await adminDb.collection('formSubmissions').add(submission);

    await adminDb.collection('forms').doc(formId).update({
      submissionCount: FieldValue.increment(1),
    });

    const fieldsMeta = fields.map((f: any) => {
      const label = lang !== 'ja' && f[`label_${lang}`] ? f[`label_${lang}`] : f.label;
      return { id: f.id, label, type: f.type };
    });

    const fromAddr = resolveFromAddress(form);

    // 管理者通知メール
    if (form.emailNotification?.enabled && form.emailNotification.to?.length > 0) {
      const subject = form.emailNotification.subject || `【${form.name}】新しいフォーム送信`;
      const html = buildAdminNotificationHtml(form.name, submissionData, fieldsMeta);
      const recipientEmail = findSubmitterEmail(submissionData, fields);

      sendEmail({
        from: fromAddr,
        to: form.emailNotification.to,
        subject,
        html,
        replyTo: recipientEmail || undefined,
      }).catch(err => console.error('[Email] Admin notification failed:', err));
    }

    // 自動返信メール
    if (form.autoReply?.enabled) {
      const recipientEmail = findSubmitterEmail(submissionData, fields);
      if (recipientEmail) {
        const autoReplyBody = lang !== 'ja' && form.autoReply[`body_${lang}`]
          ? form.autoReply[`body_${lang}`]
          : form.autoReply.body;
        const autoReplySubject = lang !== 'ja' && form.autoReply[`subject_${lang}`]
          ? form.autoReply[`subject_${lang}`]
          : (form.autoReply.subject || `【${form.name}】${DEFAULT_SUBJECT[lang]}`);

        const html = buildAutoReplyHtml(autoReplyBody, form.name, submissionData, fieldsMeta, lang);

        sendEmail({
          from: fromAddr,
          to: recipientEmail,
          subject: autoReplySubject,
          html,
        }).catch(err => console.error('[Email] Auto-reply failed:', err));
      } else {
        console.warn('[Email] Auto-reply enabled but no email field found in submission data');
      }
    }

    const response: any = {
      success: true,
      submissionId: submissionRef.id,
    };

    if (form.afterSubmit) {
      response.afterSubmit = form.afterSubmit;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error submitting form:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}

/**
 * 送信データからメールアドレスフィールドの値を探す
 * 優先順位: type=email > ラベルにメール/email > 値がメールアドレス形式
 */
function findSubmitterEmail(
  data: Record<string, any>,
  fields: any[]
): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const byType = fields.find((f: any) => f.type === 'email');
  if (byType && data[byType.id] && emailRegex.test(String(data[byType.id]))) {
    return String(data[byType.id]);
  }

  const emailLabelPattern = /メール|email|e-mail/i;
  const byLabel = fields.find((f: any) => emailLabelPattern.test(f.label || ''));
  if (byLabel && data[byLabel.id] && emailRegex.test(String(data[byLabel.id]))) {
    return String(data[byLabel.id]);
  }

  for (const field of fields) {
    const val = data[field.id];
    if (typeof val === 'string' && emailRegex.test(val)) {
      return val;
    }
  }
  return null;
}

