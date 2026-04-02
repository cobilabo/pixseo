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
    const submitterEmail = findSubmitterEmail(submissionData, fields);
    const adminNotifyOn =
      !!form.emailNotification?.enabled &&
      Array.isArray(form.emailNotification.to) &&
      form.emailNotification.to.length > 0;
    const autoReplyOn = !!form.autoReply?.enabled;

    // メール分岐の可視化（[Email] が1行も出ない場合の切り分け用。本文・アドレスは出さない）
    console.info(
      `[FormSubmit] ${formId} mail flags: autoReply=${autoReplyOn} submitterEmail=${submitterEmail ? 'ok' : 'missing'} adminNotify=${adminNotifyOn}`
    );

    // サーバーレスではレスポンス返却後にプロセスが終了しうるため、メール送信は必ず await する
    const emailTasks: Promise<void>[] = [];

    // 管理者通知メール
    if (adminNotifyOn) {
      const subject = form.emailNotification!.subject || `【${form.name}】新しいフォーム送信`;
      const html = buildAdminNotificationHtml(form.name, submissionData, fieldsMeta);

      emailTasks.push(
        sendEmail({
          from: fromAddr,
          to: form.emailNotification!.to,
          subject,
          html,
          replyTo: submitterEmail || undefined,
        }).then((r) => {
          if (!r.success) console.error('[Email] Admin notification failed:', r.error);
        })
      );
    }

    // 自動返信メール
    if (autoReplyOn) {
      if (submitterEmail) {
        const autoReplyBody = lang !== 'ja' && form.autoReply[`body_${lang}`]
          ? form.autoReply[`body_${lang}`]
          : form.autoReply.body;
        const autoReplySubject = lang !== 'ja' && form.autoReply[`subject_${lang}`]
          ? form.autoReply[`subject_${lang}`]
          : (form.autoReply.subject || `【${form.name}】${DEFAULT_SUBJECT[lang]}`);

        const html = buildAutoReplyHtml(autoReplyBody, form.name, submissionData, fieldsMeta, lang);

        emailTasks.push(
          sendEmail({
            from: fromAddr,
            to: submitterEmail,
            subject: autoReplySubject,
            html,
          }).then((r) => {
            if (!r.success) console.error('[Email] Auto-reply failed:', r.error);
          })
        );
      } else {
        console.warn('[Email] Auto-reply enabled but no email field found in submission data');
      }
    }

    if (emailTasks.length > 0) {
      await Promise.all(emailTasks);
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

  // type=email が複数ある場合は、最初の非空・有効な値を採用
  for (const f of fields) {
    if (f.type !== 'email') continue;
    const raw = data[f.id];
    if (raw != null && String(raw).trim() !== '' && emailRegex.test(String(raw))) {
      return String(raw).trim();
    }
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

