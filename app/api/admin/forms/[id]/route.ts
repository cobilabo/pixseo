import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { translateText } from '@/lib/openai/translate';
import { Lang } from '@/types/lang';

export const dynamic = 'force-dynamic';

const TARGET_LANGS: Lang[] = ['en', 'zh', 'ko'];

async function translateFormFields(fields: any[]): Promise<any[]> {
  const result = [];
  for (const field of fields) {
    const newField = { ...field, config: { ...field.config } };

    if (field.label) {
      newField.label_ja = field.label;
      for (const lang of TARGET_LANGS) {
        try {
          newField[`label_${lang}`] = await translateText(field.label, lang, 'フォームフィールドのラベル');
        } catch { newField[`label_${lang}`] = field.label; }
      }
    }

    if (field.config?.placeholder) {
      newField.config.placeholder_ja = field.config.placeholder;
      for (const lang of TARGET_LANGS) {
        try {
          newField.config[`placeholder_${lang}`] = await translateText(field.config.placeholder, lang, 'フォームフィールドのプレースホルダー');
        } catch { newField.config[`placeholder_${lang}`] = field.config.placeholder; }
      }
    }

    if (field.config?.options?.length) {
      newField.config.options_ja = field.config.options;
      for (const lang of TARGET_LANGS) {
        try {
          const translated = [];
          for (const opt of field.config.options) {
            translated.push(await translateText(opt, lang, 'フォーム選択肢'));
          }
          newField.config[`options_${lang}`] = translated;
        } catch { newField.config[`options_${lang}`] = field.config.options; }
      }
    }

    if (field.config?.text) {
      newField.config.text_ja = field.config.text;
      for (const lang of TARGET_LANGS) {
        try {
          newField.config[`text_${lang}`] = await translateText(field.config.text, lang, 'フォーム同意文');
        } catch { newField.config[`text_${lang}`] = field.config.text; }
      }
    }

    if (field.config?.content) {
      newField.config.content_ja = field.config.content;
      for (const lang of TARGET_LANGS) {
        try {
          newField.config[`content_${lang}`] = await translateText(field.config.content, lang, 'フォーム表示テキスト');
        } catch { newField.config[`content_${lang}`] = field.config.content; }
      }
    }

    result.push(newField);
  }
  return result;
}

// フォーム取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('forms').doc(params.id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const data = doc.data()!;

    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    });
  } catch (error) {
    console.error('[API] Error fetching form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

// フォーム更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name;
      updateData.name_ja = body.name;
      for (const lang of TARGET_LANGS) {
        try {
          updateData[`name_${lang}`] = await translateText(body.name, lang, 'フォーム名');
        } catch { updateData[`name_${lang}`] = body.name; }
      }
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.fields !== undefined) {
      updateData.fields = await translateFormFields(body.fields);
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.emailNotification !== undefined) updateData.emailNotification = body.emailNotification;
    if (body.autoReply !== undefined) updateData.autoReply = body.autoReply;
    if (body.afterSubmit !== undefined) {
      updateData.afterSubmit = body.afterSubmit;
      if (body.afterSubmit.message) {
        updateData.afterSubmit.message_ja = body.afterSubmit.message;
        for (const lang of TARGET_LANGS) {
          try {
            updateData.afterSubmit[`message_${lang}`] = await translateText(body.afterSubmit.message, lang, 'フォーム送信完了メッセージ');
          } catch { updateData.afterSubmit[`message_${lang}`] = body.afterSubmit.message; }
        }
      }
    }

    await adminDb.collection('forms').doc(params.id).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating form:', error);
    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    );
  }
}

// フォーム削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // フォームの送信データも削除
    const submissionsSnapshot = await adminDb
      .collection('formSubmissions')
      .where('formId', '==', params.id)
      .get();

    const batch = adminDb.batch();
    
    submissionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.delete(adminDb.collection('forms').doc(params.id));

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}

