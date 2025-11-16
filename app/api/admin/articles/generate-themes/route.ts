import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * カテゴリーと構成パターンを基に記事テーマを5つ生成
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { categoryId, patternId } = body;

    if (!mediaId || !categoryId || !patternId) {
      return NextResponse.json(
        { error: 'Media ID, category ID, and pattern ID are required' },
        { status: 400 }
      );
    }

    // カテゴリー情報を取得
    const categoryDoc = await adminDb.collection('categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const categoryName = categoryDoc.data()!.name;

    // 構成パターン情報を取得
    const patternDoc = await adminDb.collection('articlePatterns').doc(patternId).get();
    if (!patternDoc.exists) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }
    const patternData = patternDoc.data()!;
    const patternName = patternData.name;
    const patternPrompt = patternData.prompt;

    // Grok APIを呼び出し
    const grokApiKey = process.env.GROK_API_KEY;
    if (!grokApiKey) {
      return NextResponse.json(
        { error: 'Grok API key is not configured' },
        { status: 500 }
      );
    }

    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const dateString = `${currentYear}年${currentMonth}月`;

    const prompt = `【現在の日付】${dateString}

【重要】必ず${currentYear}年の最新情報に基づいてテーマを提案してください。

以下の条件に基づいて、記事テーマを5つ提案してください。

カテゴリー: ${categoryName}
構成パターン: ${patternName}

構成の詳細:
${patternPrompt}

提案する記事テーマの要件:
- ${currentYear}年の最新トレンドや情報を反映
- SEOを意識したキーワードを含む
- 読者の興味を引く魅力的なテーマ
- 上記の構成パターンで記事化しやすいテーマ
- それぞれのテーマは独立しており、重複しない

出力形式（必ず以下の形式で出力してください）:
テーマ1: [記事テーマ]
テーマ2: [記事テーマ]
テーマ3: [記事テーマ]
テーマ4: [記事テーマ]
テーマ5: [記事テーマ]`;

    console.log('[Generate Themes] Calling Grok API...');

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          {
            role: 'system',
            content: `あなたはSEOに強い記事企画の専門家です。現在は${currentYear}年${currentMonth}月です。必ず${currentYear}年の最新トレンドと情報を基に、魅力的で実用的な記事テーマを提案してください。`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!grokResponse.ok) {
      const errorData = await grokResponse.text();
      console.error('[Grok API Error]', errorData);
      return NextResponse.json(
        { error: 'Failed to generate themes with Grok API', details: errorData },
        { status: grokResponse.status }
      );
    }

    const grokData = await grokResponse.json();
    const generatedContent = grokData.choices?.[0]?.message?.content || '';

    if (!generatedContent) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

    console.log('[Generate Themes] Generated content:', generatedContent);

    // テーマを抽出
    const themeMatches = generatedContent.match(/テーマ\d+[：:]\s*(.+)/g);
    const themes: string[] = [];

    if (themeMatches && themeMatches.length > 0) {
      for (const match of themeMatches) {
        const theme = match.replace(/テーマ\d+[：:]\s*/, '').trim();
        if (theme) {
          themes.push(theme);
        }
      }
    }

    // 少なくとも1つのテーマが生成されていることを確認
    if (themes.length === 0) {
      // フォールバック: 改行で分割して最初の5行を使用
      const lines = generatedContent.split('\n').filter(line => line.trim());
      themes.push(...lines.slice(0, 5));
    }

    console.log('[Generate Themes] Extracted themes:', themes);

    return NextResponse.json({
      themes: themes.slice(0, 5), // 最大5つまで
      categoryId,
      patternId,
    });
  } catch (error) {
    console.error('[API /admin/articles/generate-themes] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate themes', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

