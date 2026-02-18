import { NextRequest } from 'next/server';
import { crawlSite } from '@/lib/site-import/crawler';
import { analyzeWithGemini } from '@/lib/site-import/analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, maxPages = 50, maxDepth = 3, excludePaths = [] } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!url) {
          send({ status: 'error', error: 'URLは必須です' });
          controller.close();
          return;
        }

        try {
          new URL(url);
        } catch {
          send({ status: 'error', error: '有効なURLを入力してください' });
          controller.close();
          return;
        }

        send({ status: 'crawling', message: 'サイトをクロール中...' });

        const crawlResult = await crawlSite(url, {
          maxPages,
          maxDepth,
          excludePatterns: [
            'wp-admin', 'wp-login', 'wp-json', '/feed', '.xml', '.pdf', '.zip',
            ...excludePaths.filter((p: string) => p.trim()),
          ],
        });

        if (crawlResult.pages.length === 0) {
          send({ status: 'error', error: 'クロール結果が0ページです。URLを確認してください。' });
          controller.close();
          return;
        }

        send({
          status: 'analyzing',
          message: `${crawlResult.pages.length}ページをクロール完了。AI解析中...`,
        });

        const analysis = await analyzeWithGemini(crawlResult);

        send({ status: 'done', data: analysis });
        controller.close();
      } catch (error: any) {
        console.error('[API site-import/analyze] Error:', error);
        send({ status: 'error', error: error.message || 'AI解析中にエラーが発生しました' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
