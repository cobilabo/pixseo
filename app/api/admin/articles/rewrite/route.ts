import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * OpenAI APIを使用して記事をリライトする
 * 記事重複チェックも同時に実行
 */
export async function POST(request: NextRequest) {
  const adminCtx = await requireAdmin(request);
  if (adminCtx instanceof NextResponse) return adminCtx;

  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { articleId, content, title } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // 既存記事との重複チェック
    const existingArticlesSnapshot = await adminDb
      .collection('articles')
      .where('mediaId', '==', mediaId)
      .where('isPublished', '==', true)
      .get();

    const existingTitles = existingArticlesSnapshot.docs
      .filter(doc => doc.id !== articleId) // 現在編集中の記事は除外
      .map(doc => doc.data().title);

    // OpenAI APIを呼び出し
    // Firebase Functions環境ではfunctions/src/index.tsでシークレットから環境変数に設定される
    // ローカル環境では.env.localから取得
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // 重複チェック用のプロンプト
    const duplicateCheckPrompt = existingTitles.length > 0
      ? `以下の既存記事タイトルと重複していないか確認してください:\n${existingTitles.join('\n')}\n\n`
      : '';

    const rewritePrompt = `${duplicateCheckPrompt}以下の記事を、より読みやすく、SEOに最適化された形にリライトしてください。

要件:
- 既存記事との重複を避ける
- 最新の情報を反映
- SEOを意識した構成
- 読みやすい文章
- 見出し（H2, H3）を適切に使用
- 元の記事の重要な情報は保持

記事タイトル: ${title || '（タイトルなし）'}
記事本文:
${content}`;

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
            content: 'あなたはSEOに強い記事リライトの専門家です。既存記事との重複を避けながら、より価値のある記事に改善してください。',
          },
          {
            role: 'user',
            content: rewritePrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('[OpenAI API Error]', errorData);
      return NextResponse.json(
        { error: 'Failed to rewrite article with OpenAI API', details: errorData },
        { status: openaiResponse.status }
      );
    }

    const openaiData = await openaiResponse.json();
    const rewrittenContent = openaiData.choices?.[0]?.message?.content || '';

    if (!rewrittenContent) {
      return NextResponse.json(
        { error: 'No rewritten content generated' },
        { status: 500 }
      );
    }

    // 重複度を計算（簡易版）
    const similarityScore = calculateSimilarity(
      title || '',
      existingTitles
    );

    return NextResponse.json({
      content: rewrittenContent,
      duplicateCheck: {
        isDuplicate: similarityScore > 0.7,
        similarityScore,
        similarTitles: existingTitles.filter(t => 
          calculateSimilarity(title || '', [t]) > 0.7
        ),
      },
    });
  } catch (error) {
    console.error('[API /admin/articles/rewrite] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to rewrite article', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * タイトルの類似度を計算（簡易版）
 */
function calculateSimilarity(title: string, existingTitles: string[]): number {
  if (!title || existingTitles.length === 0) return 0;

  const titleWords = title.toLowerCase().split(/\s+/);
  let maxSimilarity = 0;

  for (const existingTitle of existingTitles) {
    const existingWords = existingTitle.toLowerCase().split(/\s+/);
    const commonWords = titleWords.filter(word => existingWords.includes(word));
    const similarity = commonWords.length / Math.max(titleWords.length, existingWords.length);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  return maxSimilarity;
}

