import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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
    
    // フォームデータを取得
    const formDoc = await adminDb.collection('forms').doc(formId).get();

    if (!formDoc.exists) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const form = formDoc.data()!;

    // フォームが非公開の場合はエラー
    if (!form.isActive) {
      return NextResponse.json(
        { error: 'Form is not active' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const submissionData = body.data || {};

    // バリデーション: 必須フィールドのチェック
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

    // 送信データを保存
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

    // フォームの送信カウントを更新
    await adminDb.collection('forms').doc(formId).update({
      submissionCount: FieldValue.increment(1),
    });

    // TODO: メール通知の実装（Phase 3で実装）
    // if (form.emailNotification?.enabled) {
    //   await sendEmailNotification(form.emailNotification, submission);
    // }

    // レスポンス
    const response: any = {
      success: true,
      submissionId: submissionRef.id,
    };

    // afterSubmit設定に応じてレスポンスを返す
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

