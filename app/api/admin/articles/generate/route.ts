import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Grok APIを使用して記事を生成する
 * カテゴリやタグに基づいて最新の情報を取得し、記事の原案を作成
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { categoryIds, tagIds, topic, additionalContext } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    // カテゴリとタグの情報を取得
    const categories: string[] = [];
    const tags: string[] = [];

    if (categoryIds && categoryIds.length > 0) {
      const categoryDocs = await Promise.all(
        categoryIds.map((id: string) => 
          adminDb.collection('categories').doc(id).get()
        )
      );
      categoryDocs.forEach(doc => {
        if (doc.exists) {
          categories.push(doc.data()!.name);
        }
      });
    }

    if (tagIds && tagIds.length > 0) {
      const tagDocs = await Promise.all(
        tagIds.map((id: string) => 
          adminDb.collection('tags').doc(id).get()
        )
      );
      tagDocs.forEach(doc => {
        if (doc.exists) {
          tags.push(doc.data()!.name);
        }
      });
    }

    // Grok APIを呼び出し
    // Firebase Functions環境ではfunctions/src/index.tsでシークレットから環境変数に設定される
    // ローカル環境では.env.localから取得
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
    
    // プロンプトを構築
    const categoryText = categories.length > 0 ? `カテゴリ: ${categories.join(', ')}` : '';
    const tagText = tags.length > 0 ? `タグ: ${tags.join(', ')}` : '';
    const contextText = additionalContext ? `追加のコンテキスト: ${additionalContext}` : '';
    
    const prompt = `【現在の日付】${dateString}

【重要】必ず${currentYear}年の最新情報に基づいて記事を作成してください。過去の予想や古い情報は使用しないでください。

以下の条件に基づいて、最新の情報を含む記事の原案を作成してください。

${categoryText ? `${categoryText}\n` : ''}${tagText ? `${tagText}\n` : ''}${topic ? `トピック: ${topic}\n` : ''}${contextText ? `${contextText}\n` : ''}
記事の要件:
- 必ず${currentYear}年の最新の情報を含む
- SEOを意識した構成
- 読みやすい文章
- 見出し（H2, H3）を適切に使用
- 2000文字以上
- タイトルには${currentYear}年であることを明示

記事の形式（必ず以下の形式で出力してください）:
タイトル: [記事タイトル（${currentYear}年の情報であることを含める）]
メタディスクリプション: [SEO用の説明文、160文字以内]
本文: [HTML形式の記事本文]`;

    // Grok APIを呼び出し（X.AIのGrok APIエンドポイント）
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast', // Grok 4 Fast（推論モデル、最新情報アクセス可能）
        messages: [
          {
            role: 'system',
            content: `あなたはSEOに強い記事作成の専門家です。現在は${currentYear}年${currentMonth}月です。必ず${currentYear}年の最新情報を基に、読みやすく価値のある記事を作成してください。過去の予想や古い情報は使用せず、現在利用可能な最新のデータと情報のみを使用してください。`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!grokResponse.ok) {
      const errorData = await grokResponse.text();
      console.error('[Grok API Error]', errorData);
      return NextResponse.json(
        { error: 'Failed to generate article with Grok API', details: errorData },
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

    // 生成されたコンテンツを解析してタイトル、メタディスクリプション、本文を抽出
    // より柔軟なパターンマッチング
    const titleMatch = generatedContent.match(/タイトル[：:]\s*(.+?)(?:\n|メタディスクリプション|本文)/is);
    const metaDescMatch = generatedContent.match(/メタディスクリプション[：:]\s*(.+?)(?:\n|本文)/is);
    const contentMatch = generatedContent.match(/本文[：:]\s*([\s\S]+)/i);

    let title = titleMatch?.[1]?.trim() || '';
    let metaDescription = metaDescMatch?.[1]?.trim() || '';
    let content = contentMatch?.[1]?.trim() || '';

    // パターンマッチングで取得できなかった場合のフォールバック
    if (!title && !metaDescription && !content) {
      // 全体を本文として扱う
      content = generatedContent.trim();
      // 最初の行をタイトル候補として使用
      const lines = generatedContent.split('\n').filter((line: string) => line.trim());
      if (lines.length > 0) {
        title = lines[0].replace(/^#+\s*/, '').trim() || topic || '生成された記事';
      } else {
        title = topic || '生成された記事';
      }
    } else {
      // タイトルが取得できなかった場合のフォールバック
      if (!title) {
        title = topic || '生成された記事';
      }
      // コンテンツが取得できなかった場合、全体を使用
      if (!content) {
        content = generatedContent.trim();
      }
    }

    return NextResponse.json({
      title,
      excerpt: metaDescription,
      content,
      categoryIds: categoryIds || [],
      tagIds: tagIds || [],
    });
  } catch (error) {
    console.error('[API /admin/articles/generate] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate article', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

