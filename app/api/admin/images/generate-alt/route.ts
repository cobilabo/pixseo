import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OpenAI APIを使用して画像のalt属性を自動生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleTitle, contextText, imageUrl } = body;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // OpenAI APIを呼び出してalt属性を生成
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
            content: `あなたはSEOとアクセシビリティに強い専門家です。画像のalt属性を生成してください。

重要なルール:
1. 簡潔で具体的な説明（30-50文字）
2. 重要なキーワードを自然に含める
3. 視覚障害者が理解できる具体的な内容
4. 禁止事項：「画像」「写真」「イメージ」「の図」などのメタ表現は絶対に使わない
5. 画像の内容を直接的に説明する
6. 記事の文脈に合った説明

良い例:
- ❌ Gamificationで生産性向上するビジネスツールのイメージ
- ✅ Gamificationツールの管理画面でタスク完了ポイントを表示
- ❌ オフィスで働く人々の写真
- ✅ リモートワーク中にビデオ会議で議論するチームメンバー

出力は alt属性のテキストのみ（説明不要）`,
          },
          {
            role: 'user',
            content: `以下の情報から、画像のalt属性を生成してください。\n\n記事タイトル: ${articleTitle}\n\n文脈: ${contextText || '（なし）'}\n\nalt属性のみを出力してください（説明は不要）。`,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('[OpenAI API Error]', errorData);
      return NextResponse.json(
        { error: 'Failed to generate alt text with OpenAI API', details: errorData },
        { status: openaiResponse.status }
      );
    }

    const openaiData = await openaiResponse.json();
    const altText = openaiData.choices?.[0]?.message?.content?.trim() || '';

    if (!altText) {
      return NextResponse.json(
        { error: 'No alt text generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alt: altText });
  } catch (error) {
    console.error('[API /admin/images/generate-alt] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate alt text',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

