import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { translateText } from '@/lib/openai/translate';
import { Lang } from '@/types/lang';

export const dynamic = 'force-dynamic';

const TARGET_LANGS: Lang[] = ['en', 'zh', 'ko'];

// フォーム一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const formsSnapshot = await adminDb
      .collection('forms')
      .where('mediaId', '==', mediaId)
      .get();

    const forms = formsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));

    return NextResponse.json(forms);
  } catch (error) {
    console.error('[API] Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

// フォーム作成
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const formData: any = {
      name: body.name,
      name_ja: body.name,
      description: body.description || '',
      fields: body.fields || [],
      isActive: body.isActive !== undefined ? body.isActive : true,
      emailNotification: body.emailNotification || { enabled: false, to: [], subject: '' },
      autoReply: body.autoReply || { enabled: false, fromEmail: '', fromName: '', subject: '', body: '' },
      afterSubmit: body.afterSubmit || { type: 'message', message: 'お問い合わせありがとうございます。' },
      submissionCount: 0,
      mediaId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    for (const lang of TARGET_LANGS) {
      try {
        formData[`name_${lang}`] = await translateText(body.name, lang, 'フォーム名');
      } catch { formData[`name_${lang}`] = body.name; }
    }

    if (formData.autoReply?.subject) {
      formData.autoReply.subject_ja = formData.autoReply.subject;
      for (const lang of TARGET_LANGS) {
        try {
          formData.autoReply[`subject_${lang}`] = await translateText(formData.autoReply.subject, lang, '自動返信メールの件名');
        } catch { formData.autoReply[`subject_${lang}`] = formData.autoReply.subject; }
      }
    }
    if (formData.autoReply?.body) {
      formData.autoReply.body_ja = formData.autoReply.body;
      for (const lang of TARGET_LANGS) {
        try {
          formData.autoReply[`body_${lang}`] = await translateText(formData.autoReply.body, lang, '自動返信メールの本文');
        } catch { formData.autoReply[`body_${lang}`] = formData.autoReply.body; }
      }
    }

    if (formData.afterSubmit?.message) {
      formData.afterSubmit.message_ja = formData.afterSubmit.message;
      for (const lang of TARGET_LANGS) {
        try {
          formData.afterSubmit[`message_${lang}`] = await translateText(formData.afterSubmit.message, lang, 'フォーム送信完了メッセージ');
        } catch { formData.afterSubmit[`message_${lang}`] = formData.afterSubmit.message; }
      }
    }

    const docRef = await adminDb.collection('forms').add(formData);

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}

