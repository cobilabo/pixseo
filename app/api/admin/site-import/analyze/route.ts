import { NextRequest } from 'next/server';
import { analyzeWithGemini } from '@/lib/site-import/analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface CrawlDataPage {
  url: string;
  title: string;
  metaDescription: string;
  images: string[];
  bodyHtml: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { crawlData } = body as { crawlData: { pages: CrawlDataPage[] } };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!crawlData?.pages || crawlData.pages.length === 0) {
          send({ status: 'error', error: 'クロールデータが必要です。先にクロールを実行してください。' });
          controller.close();
          return;
        }

        send({
          status: 'analyzing',
          message: `${crawlData.pages.length}ページのAI解析を開始...`,
        });

        const onProgress = (message: string) => {
          send({ status: 'analyzing', message });
        };

        const analysis = await analyzeWithGemini(crawlData, onProgress);

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
