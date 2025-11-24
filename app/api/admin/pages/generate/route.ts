import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import OpenAI from 'openai';
import { Block } from '@/types/block';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分

/**
 * AI固定ページ生成
 * プロンプトからブロック構造とコンテンツを生成
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    console.log('[AI Page Generate] Starting generation with prompt:', prompt);

    // Step 1: ページ構造を生成
    const structurePrompt = `以下のリクエストに基づいて、Webページの構造を設計してください。

リクエスト: ${prompt}

以下のJSON形式で出力してください：
{
  "title": "ページタイトル",
  "slug": "page-slug",
  "excerpt": "ページの説明（100文字程度）",
  "blocks": [
    {
      "type": "text" | "image" | "cta" | "html",
      "content": "ブロックの内容説明"
    }
  ]
}

ブロックタイプの説明：
- text: テキストコンテンツ（見出し、段落など）
- image: 画像（説明文のみ）
- cta: ボタン/リンク
- html: カスタムHTML

注意事項：
- slugは英数字とハイフンのみ使用
- blocksは3-8個程度
- 実用的で読みやすい構成にする`;

    const structureResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはプロのWebデザイナーです。ユーザーのリクエストに基づいて、最適なページ構造を設計してください。',
        },
        {
          role: 'user',
          content: structurePrompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const structure = JSON.parse(structureResponse.choices[0].message.content || '{}');
    
    console.log('[AI Page Generate] Structure generated:', structure);

    // Step 2: 各ブロックの詳細コンテンツを生成
    const blocks: Block[] = [];
    
    for (let i = 0; i < structure.blocks.length; i++) {
      const blockSpec = structure.blocks[i];
      
      if (blockSpec.type === 'text') {
        // テキストブロックのHTML生成
        const contentPrompt = `以下の内容に基づいて、HTML形式でテキストコンテンツを生成してください。

内容: ${blockSpec.content}
ページタイトル: ${structure.title}

要件：
- 適切な見出しタグ（h2, h3）を使用
- 段落（p）で構成
- リスト（ul/ol）も必要に応じて使用
- HTMLタグのみ出力（説明文は不要）

出力例：
<h2>見出し</h2>
<p>段落テキスト...</p>
<h3>小見出し</h3>
<p>段落テキスト...</p>`;

        const contentResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'あなたはプロのライターです。読みやすく、SEOに最適化されたコンテンツを作成してください。',
            },
            {
              role: 'user',
              content: contentPrompt,
            },
          ],
          temperature: 0.7,
        });

        const htmlContent = contentResponse.choices[0].message.content?.trim() || '<p>コンテンツ</p>';

        blocks.push({
          id: `block-${i}`,
          type: 'text',
          order: i,
          config: {
            content: htmlContent,
            alignment: 'left',
            fontSize: 1,
            fontWeight: 'normal',
          },
        });

      } else if (blockSpec.type === 'image') {
        // 画像ブロック（プレースホルダー）
        blocks.push({
          id: `block-${i}`,
          type: 'image',
          order: i,
          config: {
            imageUrl: '',
            alt: blockSpec.content || '画像',
            caption: blockSpec.content,
            width: 100,
            alignment: 'center',
          },
        });

      } else if (blockSpec.type === 'cta') {
        // CTAブロック
        blocks.push({
          id: `block-${i}`,
          type: 'cta',
          order: i,
          config: {
            imageUrl: '',
            imageAlt: '',
            imagePosition: 'background',
            heading: blockSpec.content || '見出し',
            headingFontSize: 1,
            headingFontWeight: 'normal',
            headingTextColor: '',
            description: '',
            textFontSize: 1,
            textFontWeight: 'normal',
            textColor: '',
            buttons: [
              {
                type: 'text',
                text: 'ボタン',
                url: '#',
                buttonColor: '',
                fontSize: 1,
                fontWeight: 'normal',
                textColor: '',
                openInNewTab: false,
              },
            ],
            buttonLayout: 'horizontal',
          },
        });

      } else if (blockSpec.type === 'html') {
        // HTMLブロック
        blocks.push({
          id: `block-${i}`,
          type: 'html',
          order: i,
          config: {
            html: `<div class="custom-content">${blockSpec.content}</div>`,
          },
        });
      }
    }

    console.log('[AI Page Generate] Generated', blocks.length, 'blocks');

    // Step 3: ページを保存
    const pageData: any = {
      title: structure.title,
      title_ja: structure.title,
      slug: structure.slug,
      excerpt: structure.excerpt || '',
      excerpt_ja: structure.excerpt || '',
      metaTitle: structure.title,
      metaTitle_ja: structure.title,
      metaDescription: structure.excerpt || '',
      metaDescription_ja: structure.excerpt || '',
      content: '<!-- AI Generated Page with Blocks -->',
      content_ja: '<!-- AI Generated Page with Blocks -->',
      featuredImage: '',
      featuredImageAlt: '',
      isPublished: false, // 非公開で保存
      order: 0,
      useBlockBuilder: true, // ブロックビルダー使用
      blocks, // 生成されたブロック
      mediaId,
      publishedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    // 他言語は日本語と同じ内容をコピー（簡易版）
    const langs = ['en', 'zh', 'ko'];
    for (const lang of langs) {
      pageData[`title_${lang}`] = structure.title;
      pageData[`content_${lang}`] = pageData.content;
      pageData[`excerpt_${lang}`] = structure.excerpt || '';
      pageData[`metaTitle_${lang}`] = structure.title;
      pageData[`metaDescription_${lang}`] = structure.excerpt || '';
    }

    const docRef = await adminDb.collection('pages').add(pageData);

    console.log('[AI Page Generate] Page created with ID:', docRef.id);

    return NextResponse.json({
      success: true,
      pageId: docRef.id,
      title: structure.title,
      blocksCount: blocks.length,
    });

  } catch (error) {
    console.error('[AI Page Generate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate page',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

