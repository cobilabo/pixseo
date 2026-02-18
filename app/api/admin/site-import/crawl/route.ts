import { NextRequest, NextResponse } from 'next/server';
import { crawlSite } from '@/lib/site-import/crawler';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, maxPages = 20, maxDepth = 3 } = body;

    if (!url) {
      return NextResponse.json({ error: 'URLは必須です' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: '有効なURLを入力してください' }, { status: 400 });
    }

    const result = await crawlSite(url, { maxPages, maxDepth });

    return NextResponse.json({
      success: true,
      data: {
        pageCount: result.pages.length,
        imageCount: result.allImages.length,
        cssCount: result.allCssUrls.length,
        pages: result.pages.map(p => ({
          url: p.url,
          title: p.title,
          metaDescription: p.metaDescription,
          imageCount: p.images.length,
        })),
        // Full crawl result for next step (stored on client)
        crawlResult: result,
      },
    });
  } catch (error: any) {
    console.error('[API site-import/crawl] Error:', error);
    return NextResponse.json(
      { error: error.message || 'クロール中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
