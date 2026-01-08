import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

/**
 * FAQ自動生成API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // HTMLタグを除去してプレーンテキストに
    const plainContent = content.replace(/<[^>]*>/g, '').trim();

    // FAQ生成
    const faqPrompt = `以下の記事に基づいて、読者が抱くであろう質問とその回答を3〜5個生成してください。

タイトル: ${title}
本文: ${plainContent.substring(0, 1500)}

出力形式:
Q: [質問]
A: [回答]

Q: [質問]
A: [回答]`;

    const faqResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはFAQ生成の専門家です。読者の疑問を先回りして、分かりやすい回答を作成してください。',
        },
        {
          role: 'user',
          content: faqPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const faqText = faqResponse.choices[0]?.message?.content || '';
    
    // より柔軟な正規表現でマッチング
    const faqMatches = Array.from(faqText.matchAll(/Q:\s*([^\n]+)\s*\n\s*A:\s*([^\n]+(?:\n(?!Q:)[^\n]+)*)/gi));
    
    const faqs = [];
    for (const match of faqMatches) {
      if (match[1] && match[2]) {
        faqs.push({
          question: match[1].trim(),
          answer: match[2].trim().replace(/\n+/g, ' '),
        });
      }
    }

    return NextResponse.json({ faqs });
  } catch (error) {
    console.error('[FAQ Generation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate FAQ' },
      { status: 500 }
    );
  }
}

