import { NextRequest } from 'next/server';
import { analyzeSelectors, SelectorAnalysisInput } from '@/lib/site-import/analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { samplePages, allPages } = body as SelectorAnalysisInput;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!samplePages?.length || !allPages?.length) {
          send({ status: 'error', error: 'クロールデータが必要です。先にクロールを実行してください。' });
          controller.close();
          return;
        }

        send({
          status: 'analyzing',
          message: `${allPages.length}ページのAI解析を開始...`,
        });

        const onProgress = (message: string) => {
          send({ status: 'analyzing', message });
        };

        const result = await analyzeSelectors({ samplePages, allPages }, onProgress);

        send({ status: 'done', data: result });
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
