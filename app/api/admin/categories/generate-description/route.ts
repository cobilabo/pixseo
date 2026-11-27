import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * カテゴリー名からSEO最適化された説明文を生成
 */
export async function POST(request: NextRequest) {
  const adminCtx = await requireAdmin(request);
  if (adminCtx instanceof NextResponse) return adminCtx;

  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const prompt = `あなたはSEOとコンテンツマーケティングの専門家です。

以下のカテゴリー名から、SEO最適化されたカテゴリー説明文を生成してください。

カテゴリー名: ${name}

要件:
- 120-180文字程度（日本語）
- カテゴリーに関連する主要キーワードを自然に2-3回含める
- 関連するロングテールキーワードを含める
- 対象読者を明確にする
- 提供価値を明示する
- 具体的なツール名や技術名があれば含める
- SEO効果を最大化する
- 自然で読みやすい文章にする

説明文のみを出力してください。余計な前置きや説明は不要です。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはSEOとコンテンツマーケティングの専門家です。カテゴリー説明文の生成を支援します。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const description = completion.choices[0]?.message?.content?.trim() || '';

    if (!description) {
      throw new Error('Failed to generate description');
    }

    return NextResponse.json({ description });
  } catch (error: any) {
    console.error('[API] Category description generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate category description',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

