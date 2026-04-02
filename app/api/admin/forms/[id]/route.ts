import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { translateText } from '@/lib/openai/translate';
import { Lang } from '@/types/lang';

export const dynamic = 'force-dynamic';

const TARGET_LANGS: Lang[] = ['en', 'zh', 'ko'];

async function translateFormFields(fields: any[]): Promise<any[]> {
  type Job = { fieldIdx: number; target: 'field' | 'config'; key: string; lang: Lang; text: string; context: string };
  const jobs: Job[] = [];

  const fieldsCopy = fields.map(f => ({ ...f, config: { ...f.config } }));

  for (let i = 0; i < fieldsCopy.length; i++) {
    const field = fieldsCopy[i];
    const cfg = field.config || {};

    if (field.label) {
      field.label_ja = field.label;
      for (const lang of TARGET_LANGS) jobs.push({ fieldIdx: i, target: 'field', key: 'label', lang, text: field.label, context: 'フォームフィールドのラベル' });
    }
    if (cfg.placeholder) {
      cfg.placeholder_ja = cfg.placeholder;
      for (const lang of TARGET_LANGS) jobs.push({ fieldIdx: i, target: 'config', key: 'placeholder', lang, text: cfg.placeholder, context: 'フォームフィールドのプレースホルダー' });
    }
    if (cfg.text) {
      cfg.text_ja = cfg.text;
      for (const lang of TARGET_LANGS) jobs.push({ fieldIdx: i, target: 'config', key: 'text', lang, text: cfg.text, context: 'フォーム同意文' });
    }
    if (cfg.consentBody) {
      cfg.consentBody_ja = cfg.consentBody;
      for (const lang of TARGET_LANGS) jobs.push({ fieldIdx: i, target: 'config', key: 'consentBody', lang, text: cfg.consentBody, context: 'フォーム同意文（詳細）' });
    }
    if (cfg.content) {
      cfg.content_ja = cfg.content;
      for (const lang of TARGET_LANGS) jobs.push({ fieldIdx: i, target: 'config', key: 'content', lang, text: cfg.content, context: 'フォーム表示テキスト' });
    }
    if (cfg.options?.length) {
      cfg.options_ja = cfg.options;
      for (const lang of TARGET_LANGS) {
        jobs.push({ fieldIdx: i, target: 'config', key: `options_array`, lang, text: cfg.options.join('\n---\n'), context: 'フォーム選択肢（各行は---で区切られた個別の選択肢）' });
      }
    }
  }

  const BATCH_SIZE = 10;
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(job => translateText(job.text, job.lang, job.context))
    );

    results.forEach((result, idx) => {
      const job = batch[idx];
      const field = fieldsCopy[job.fieldIdx];
      const translated = result.status === 'fulfilled' ? result.value : job.text;

      if (result.status === 'rejected') {
        console.error(`[Form Translation] Failed: field=${job.key} lang=${job.lang}`, result.reason);
      }

      if (job.key === 'options_array') {
        field.config[`options_${job.lang}`] = translated.split('\n---\n');
      } else if (job.target === 'field') {
        field[`${job.key}_${job.lang}`] = translated;
      } else {
        field.config[`${job.key}_${job.lang}`] = translated;
      }
    });
  }

  return fieldsCopy;
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

    const hasApiKey = !!process.env.OPENAI_API_KEY;
    if (!hasApiKey) {
      console.warn('[Form Save] OPENAI_API_KEY is not set — translations will be skipped');
    }

    let translationFailCount = 0;

    const updateData: any = {
      updatedAt: new Date(),
    };

    const metaJobs: Array<{ path: string[]; lang: Lang; text: string; context: string }> = [];

    if (body.name !== undefined) {
      updateData.name = body.name;
      updateData.name_ja = body.name;
      for (const lang of TARGET_LANGS) metaJobs.push({ path: [`name_${lang}`], lang, text: body.name, context: 'フォーム名' });
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.emailNotification !== undefined) updateData.emailNotification = body.emailNotification;
    if (body.autoReply !== undefined) {
      updateData.autoReply = { ...body.autoReply };
      if (body.autoReply.subject) {
        updateData.autoReply.subject_ja = body.autoReply.subject;
        for (const lang of TARGET_LANGS) metaJobs.push({ path: ['autoReply', `subject_${lang}`], lang, text: body.autoReply.subject, context: '自動返信メールの件名' });
      }
      if (body.autoReply.body) {
        updateData.autoReply.body_ja = body.autoReply.body;
        for (const lang of TARGET_LANGS) metaJobs.push({ path: ['autoReply', `body_${lang}`], lang, text: body.autoReply.body, context: '自動返信メールの本文' });
      }
    }
    if (body.afterSubmit !== undefined) {
      updateData.afterSubmit = body.afterSubmit;
      if (body.afterSubmit.message) {
        updateData.afterSubmit.message_ja = body.afterSubmit.message;
        for (const lang of TARGET_LANGS) metaJobs.push({ path: ['afterSubmit', `message_${lang}`], lang, text: body.afterSubmit.message, context: 'フォーム送信完了メッセージ' });
      }
    }

    if (hasApiKey && metaJobs.length > 0) {
      const results = await Promise.allSettled(
        metaJobs.map(j => translateText(j.text, j.lang, j.context))
      );
      results.forEach((result, idx) => {
        const job = metaJobs[idx];
        const translated = result.status === 'fulfilled' ? result.value : job.text;
        if (result.status === 'rejected') {
          translationFailCount++;
          console.error(`[Form Meta Translation] Failed: path=${job.path.join('.')} lang=${job.lang}`, result.reason);
        }
        if (job.path.length === 1) {
          updateData[job.path[0]] = translated;
        } else {
          updateData[job.path[0]][job.path[1]] = translated;
        }
      });
    } else if (!hasApiKey) {
      metaJobs.forEach((job) => {
        if (job.path.length === 1) {
          updateData[job.path[0]] = job.text;
        } else {
          updateData[job.path[0]][job.path[1]] = job.text;
        }
      });
    }

    if (body.fields !== undefined) {
      updateData.fields = hasApiKey ? await translateFormFields(body.fields) : body.fields;
    }

    await adminDb.collection('forms').doc(params.id).update(updateData);

    const translationStatus = !hasApiKey
      ? 'skipped (OPENAI_API_KEY not configured)'
      : translationFailCount > 0
        ? `partial (${translationFailCount} translations failed)`
        : 'success';

    console.log(`[Form Save] Complete. Translation status: ${translationStatus}`);

    return NextResponse.json({ success: true, translationStatus });
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

