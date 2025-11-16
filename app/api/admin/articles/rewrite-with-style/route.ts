import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * ライティング特徴に基づいて記事をリライト
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { title, content, writingStyleId } = body;

    if (!mediaId || !title || !content || !writingStyleId) {
      return NextResponse.json(
        { error: 'Media ID, title, content, and writing style ID are required' },
        { status: 400 }
      );
    }

    // ライティング特徴情報を取得
    const styleDoc = await adminDb.collection('writingStyles').doc(writingStyleId).get();
    if (!styleDoc.exists) {
      return NextResponse.json({ error: 'Writing style not found' }, { status: 404 });
    }
    const styleData = styleDoc.data()!;
    const styleName = styleData.name;
    const stylePrompt = styleData.prompt;

    // Grok APIを呼び出し
    const grokApiKey = process.env.GROK_API_KEY;
    if (!grokApiKey) {
      return NextResponse.json(
        { error: 'Grok API key is not configured' },
        { status: 500 }
      );
    }

    // HTMLタグを一時的に除去してテキストのみを抽出
    const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const prompt = `以下の記事を、指定されたライティングスタイルでリライトしてください。

【ライティングスタイル】
${styleName}

【スタイルの詳細】
${stylePrompt}

【元の記事タイトル】
${title}

【元の記事本文】
${plainContent}

【重要な指示】
1. 記事の内容や情報は変更せず、文章のトーンや表現のみを変更してください
2. HTMLタグは使用せず、プレーンテキストで出力してください
3. 記事の構成（見出し、段落など）は維持してください
4. 指定されたライティングスタイルに完全に従ってください
5. タイトルは変更せず、本文のみをリライトしてください

リライトした本文のみを出力してください:`;

    console.log('[Rewrite With Style] Calling Grok API...');

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
            content: `あなたはプロのライターです。指定されたライティングスタイルに従って、記事を自然にリライトしてください。内容は変更せず、文章のトーンや表現のみを調整してください。`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 5000,
      }),
    });

    if (!grokResponse.ok) {
      const errorData = await grokResponse.text();
      console.error('[Grok API Error]', errorData);
      return NextResponse.json(
        { error: 'Failed to rewrite with Grok API', details: errorData },
        { status: grokResponse.status }
      );
    }

    const grokData = await grokResponse.json();
    const rewrittenContent = grokData.choices?.[0]?.message?.content || '';

    if (!rewrittenContent) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

    console.log('[Rewrite With Style] Rewrite completed');

    // リライトされたコンテンツを段落ごとに<p>タグで囲む
    const paragraphs = rewrittenContent
      .split('\n')
      .filter(p => p.trim())
      .map(p => {
        // 見出しっぽいもの（短い行）はH2タグに
        if (p.trim().length < 50 && !p.includes('。') && !p.includes('、')) {
          return `<h2>${p.trim()}</h2>`;
        }
        return `<p>${p.trim()}</p>`;
      })
      .join('\n');

    return NextResponse.json({
      rewrittenContent: paragraphs,
      styleName,
    });
  } catch (error) {
    console.error('[API /admin/articles/rewrite-with-style] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to rewrite article', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

