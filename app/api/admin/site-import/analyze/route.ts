import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithGemini } from '@/lib/site-import/analyzer';
import { CrawlResult } from '@/lib/site-import/crawler';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { crawlResult } = body as { crawlResult: CrawlResult };

    if (!crawlResult || !crawlResult.pages || crawlResult.pages.length === 0) {
      return NextResponse.json(
        { error: 'クロール結果が必要です。先にクロールを実行してください。' },
        { status: 400 }
      );
    }

    const analysis = await analyzeWithGemini(crawlResult);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('[API site-import/analyze] Error:', error);
    return NextResponse.json(
      { error: error.message || 'AI解析中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
