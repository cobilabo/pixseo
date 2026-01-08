import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import OpenAI from 'openai';
import { FormField, FormFieldType } from '@/types/block';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分

/**
 * AIフォーム生成
 * プロンプトからフォーム構造を生成
 */
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
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    // フォーム構造を生成
    const structurePrompt = `以下のリクエストに基づいて、フォームの構造を設計してください。

リクエスト: ${prompt}

以下のJSON形式で出力してください：
{
  "name": "フォーム名",
  "description": "フォームの説明",
  "fields": [
    {
      "type": "text" | "textarea" | "email" | "tel" | "number" | "name" | "address" | "select" | "radio" | "checkbox" | "consent" | "text_display",
      "label": "フィールドのラベル",
      "required": true | false,
      "config": {
        // フィールドタイプに応じた設定
      }
    }
  ],
  "afterSubmit": {
    "type": "message",
    "message": "送信完了メッセージ"
  }
}

利用可能なフィールドタイプ：
- text: 1行テキスト入力
- textarea: 複数行テキスト入力
- email: メールアドレス
- tel: 電話番号
- number: 数値
- name: 氏名（姓名）
- address: 住所
- select: プルダウン選択
- radio: ラジオボタン
- checkbox: チェックボックス
- consent: 同意確認
- text_display: 説明文表示

config設定例：
- text/email/tel: { "placeholder": "プレースホルダー" }
- textarea: { "placeholder": "プレースホルダー", "rows": 4 }
- number: { "min": 0, "max": 100, "step": 1 }
- select/radio/checkbox: { "options": ["選択肢1", "選択肢2"] }
- consent: { "text": "同意テキスト" }
- text_display: { "content": "表示テキスト" }

注意事項：
- 実用的なフォームを設計する
- 必須フィールドを適切に設定
- バリデーションを考慮`;

    const structureResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはプロのUXデザイナーです。ユーザーのリクエストに基づいて、使いやすく実用的なフォームを設計してください。',
        },
        {
          role: 'user',
          content: structurePrompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const structure = JSON.parse(structureResponse.choices[0].message.content || '{}');
    // フィールドを整形
    const fields: FormField[] = structure.fields.map((field: any, index: number) => ({
      id: `field-${index}`,
      type: field.type as FormFieldType,
      label: field.label,
      required: field.required || false,
      order: index,
      config: field.config || {},
    }));
    // フォームを保存
    const formData: any = {
      name: structure.name,
      description: structure.description || '',
      fields,
      isActive: true, // 公開状態で保存
      emailNotification: {
        enabled: false,
        to: [],
        subject: '',
      },
      afterSubmit: structure.afterSubmit || {
        type: 'message',
        message: 'お問い合わせありがとうございます。',
      },
      submissionCount: 0,
      mediaId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('forms').add(formData);
    return NextResponse.json({
      success: true,
      formId: docRef.id,
      name: structure.name,
      fieldsCount: fields.length,
    });

  } catch (error) {
    console.error('[AI Form Generate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate form',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

