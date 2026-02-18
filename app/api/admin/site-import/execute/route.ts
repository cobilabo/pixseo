import { NextRequest, NextResponse } from 'next/server';
import { executeImport, ImportOptions } from '@/lib/site-import/importer';
import { AnalysisResult } from '@/lib/site-import/analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysis, options } = body as {
      analysis: AnalysisResult;
      options: ImportOptions;
    };

    if (!analysis || !analysis.pages || analysis.pages.length === 0) {
      return NextResponse.json(
        { error: '解析結果が必要です。先にAI解析を実行してください。' },
        { status: 400 }
      );
    }

    if (!options?.mediaId) {
      return NextResponse.json(
        { error: 'メディアIDは必須です' },
        { status: 400 }
      );
    }

    const result = await executeImport(analysis, options);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[API site-import/execute] Error:', error);
    return NextResponse.json(
      { error: error.message || 'インポート実行中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
