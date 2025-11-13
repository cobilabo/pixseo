import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OpenAI APIを使用してSEO最適化されたメタタイトルを自動生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
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

    // OpenAI APIを呼び出してメタタイトルを生成
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `あなたはSEOの専門家です。記事タイトルからSEOに最適化されたメタタイトルを生成してください。

重要なルール:
1. 60文字以内に収める（検索結果で切れない長さ）
2. 重要なキーワードを前半に配置
3. 自然で読みやすい日本語を優先
4. クリックしたくなる魅力的な表現
5. 禁止事項：【】★などの装飾記号は使わない
6. 数字や年号を活用して具体性を出す
7. シンプルで分かりやすい構成

良い例:
- ❌ Gamification活用ビジネスツール2025年最新トレンドとおすすめ紹介
- ✅ Gamificationツール比較2025｜おすすめ10選と導入事例
- ❌ 【最新版】SEO対策の完全ガイド★初心者向け徹底解説
- ✅ SEO対策の基本2025｜初心者でもできる10の施策

構成パターン:
- 「メインキーワード + 数字 + 年号｜具体的な内容」
- 「メインキーワード + 比較/ランキング/事例｜詳細」
- 「メインキーワード + 用途｜対象者や特徴」

出力はメタタイトルのテキストのみ（説明不要）`,
          },
          {
            role: 'user',
            content: `以下の記事タイトルから、SEO最適化されたメタタイトル（70文字以内）を生成してください。\n\n記事タイトル: ${title}\n\nメタタイトルのみを出力してください（説明は不要）。`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('[OpenAI API Error]', errorData);
      return NextResponse.json(
        { error: 'Failed to generate meta title with OpenAI API', details: errorData },
        { status: openaiResponse.status }
      );
    }

    const openaiData = await openaiResponse.json();
    let metaTitle = openaiData.choices?.[0]?.message?.content?.trim() || '';

    if (!metaTitle) {
      return NextResponse.json(
        { error: 'No meta title generated' },
        { status: 500 }
      );
    }

    // 70文字を超える場合はトリミング
    if (metaTitle.length > 70) {
      metaTitle = metaTitle.substring(0, 67) + '...';
    }

    return NextResponse.json({ metaTitle });
  } catch (error) {
    console.error('[API /admin/articles/generate-meta-title] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate meta title',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

