import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, buildAdminNotificationHtml, buildAutoReplyHtml } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * フォーム送信
 * ユーザーがフロントエンドからフォームを送信する際のエンドポイント
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
      submittedAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      mediaId: form.mediaId,
    };

    const submissionRef = await adminDb.collection('formSubmissions').add(submission);

    await adminDb.collection('forms').doc(formId).update({
      submissionCount: FieldValue.increment(1),
    });

    const fieldsMeta = fields.map((f: any) => ({ id: f.id, label: f.label, type: f.type }));

    // 管理者通知メール
    if (form.emailNotification?.enabled && form.emailNotification.to?.length > 0) {
      const fromEmail = form.autoReply?.fromEmail
        ? `${form.autoReply.fromName || form.name} <${form.autoReply.fromEmail}>`
        : 'noreply@resend.dev';
      const subject = form.emailNotification.subject || `【${form.name}】新しいフォーム送信`;
      const html = buildAdminNotificationHtml(form.name, submissionData, fieldsMeta);

      const recipientEmail = findSubmitterEmail(submissionData, fields);

      sendEmail({
        from: fromEmail,
        to: form.emailNotification.to,
        subject,
        html,
        replyTo: recipientEmail || undefined,
      }).catch(err => console.error('[Email] Admin notification failed:', err));
    }

    // 自動返信メール
    if (form.autoReply?.enabled && form.autoReply.fromEmail) {
      const recipientEmail = findSubmitterEmail(submissionData, fields);
      if (recipientEmail) {
        const fromAddr = form.autoReply.fromName
          ? `${form.autoReply.fromName} <${form.autoReply.fromEmail}>`
          : form.autoReply.fromEmail;
        const subject = form.autoReply.subject || `【${form.name}】お問い合わせありがとうございます`;
        const html = buildAutoReplyHtml(form.autoReply.body, form.name, submissionData, fieldsMeta);

        sendEmail({
          from: fromAddr,
          to: recipientEmail,
          subject,
          html,
        }).catch(err => console.error('[Email] Auto-reply failed:', err));
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

