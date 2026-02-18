import { NextRequest, NextResponse } from 'next/server';
import { crawlSite } from '@/lib/site-import/crawler';
import { analyzeWithGemini } from '@/lib/site-import/analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, maxPages = 50, maxDepth = 3, excludePaths = [] } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URLは必須です' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: '有効なURLを入力してください' },
        { status: 400 }
      );
    }

    const crawlResult = await crawlSite(url, {
      maxPages,
      maxDepth,
      excludePatterns: [
        'wp-admin', 'wp-login', 'wp-json', '/feed', '.xml', '.pdf', '.zip',
        ...excludePaths.filter((p: string) => p.trim()),
      ],
    });

    if (crawlResult.pages.length === 0) {
      return NextResponse.json(
        { error: 'クロール結果が0ページです。URLを確認してください。' },
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
