import { NextRequest, NextResponse } from 'next/server';
import { generateAdvancedArticle } from '@/lib/article-generation/generate-advanced';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分

/**
 * 12ステップの高度な記事生成フロー（手動実行用）
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const {
      categoryId,
      patternId,
      writerId,
      imagePromptPatternId,
      targetAudience,
    } = body;

    if (!mediaId || !categoryId || !patternId || !writerId || !imagePromptPatternId || !targetAudience) {
      return NextResponse.json(
        { error: 'All parameters are required' },
        { status: 400 }
      );
    }

    // 共通関数を呼び出し
    const result = await generateAdvancedArticle({
      mediaId,
      categoryId,
      patternId,
      writerId,
      imagePromptPatternId,
      targetAudience,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /admin/articles/generate-advanced] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate advanced article', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
