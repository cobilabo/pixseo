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
    const { categoryId, title, excludeHistory } = body;

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

      let excludeText = '';
      if (excludeHistory && Array.isArray(excludeHistory) && excludeHistory.length > 0) {
        excludeText = `\n\n【重要】以下の想定読者は既に使用されているため、これらとは異なる新しい想定読者を提案してください:\n${excludeHistory.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}`;
      }

      prompt = `以下のカテゴリー情報から、最も適切な想定読者（ペルソナ）を提案してください。

カテゴリー名: ${categoryName}
${categoryDescription ? `カテゴリー説明: ${categoryDescription}` : ''}${excludeText}

要件:
- **1つの具体的な職業や立場のみ**を記述（複数列挙は禁止）
- カンマで区切って複数の職業を列挙しないこと
- 30文字以内で簡潔に
- 「〜の方」「〜の人」などの表現は不要
- 良い例: 「フリーランスのWebデザイナー」「エンタープライズ企業のCTO」「スタートアップの創業者」
- 悪い例: 「企業のマーケティング担当者、教育機関のカリキュラム開発者」（カンマで複数列挙）

想定読者:`;
    } 
    // タイトルが提供された場合
    else if (title) {
      let excludeText = '';
      if (excludeHistory && Array.isArray(excludeHistory) && excludeHistory.length > 0) {
        excludeText = `\n\n【重要】以下の想定読者は既に使用されているため、これらとは異なる新しい想定読者を提案してください:\n${excludeHistory.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}`;
      }

      prompt = `以下の記事タイトルから、最も適切な想定読者（ペルソナ）を提案してください。

記事タイトル: ${title}${excludeText}

要件:
- **1つの具体的な職業や立場のみ**を記述（複数列挙は禁止）
- カンマで区切って複数の職業を列挙しないこと
- 30文字以内で簡潔に
- 「〜の方」「〜の人」などの表現は不要
- 良い例: 「フリーランスのWebデザイナー」「エンタープライズ企業のCTO」「スタートアップの創業者」
- 悪い例: 「企業のマーケティング担当者、教育機関のカリキュラム開発者」（カンマで複数列挙）

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
          content: 'あなたはマーケティングとペルソナ設計の専門家です。記事タイトルまたはカテゴリー情報から最適な想定読者を**1つだけ**提案してください。カンマで複数を列挙することは絶対に禁止です。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 50,
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

