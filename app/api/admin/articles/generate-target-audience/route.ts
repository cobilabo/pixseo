import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

/**
 * カテゴリー名から想定読者（ペルソナ）をAIで自動生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, title } = body;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    let prompt = '';

    // カテゴリーIDが提供された場合
    if (categoryId) {
      const categoryDoc = await adminDb.collection('categories').doc(categoryId).get();

      if (!categoryDoc.exists) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }

      const categoryName = categoryDoc.data()!.name;
      const categoryDescription = categoryDoc.data()!.description || '';

      prompt = `以下のカテゴリー情報から、最も適切な想定読者（ペルソナ）を1文で簡潔に提案してください。

カテゴリー名: ${categoryName}
${categoryDescription ? `カテゴリー説明: ${categoryDescription}` : ''}

要件:
- 具体的な職業や立場を含める（例: 「フリーランスのWebデザイナー」「エンタープライズ企業のCTO」）
- 1文で簡潔に（50文字以内）
- 「〜の方」「〜の人」などの表現は不要
- 例: 「スタートアップの創業者、プロダクトマネージャー」

想定読者:`;
    } 
    // タイトルが提供された場合
    else if (title) {
      prompt = `以下の記事タイトルから、最も適切な想定読者（ペルソナ）を1文で簡潔に提案してください。

記事タイトル: ${title}

要件:
- 具体的な職業や立場を含める（例: 「フリーランスのWebデザイナー」「エンタープライズ企業のCTO」）
- 1文で簡潔に（50文字以内）
- 「〜の方」「〜の人」などの表現は不要
- 例: 「スタートアップの創業者、プロダクトマネージャー」

想定読者:`;
    } else {
      return NextResponse.json(
        { error: 'Category ID or title is required' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはマーケティングとペルソナ設計の専門家です。記事タイトルまたはカテゴリー情報から最適な想定読者を提案してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const targetAudience = completion.choices[0]?.message?.content?.trim() || '';

    if (!targetAudience) {
      throw new Error('Failed to generate target audience');
    }

    console.log(`[Generate Target Audience] → Audience: ${targetAudience}`);

    return NextResponse.json({ targetAudience });
  } catch (error) {
    console.error('[Generate Target Audience] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate target audience' },
      { status: 500 }
    );
  }
}

