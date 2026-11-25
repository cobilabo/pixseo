import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { 
  translateText, 
  translateBatch, 
  translateArticle, 
  translateFAQs,
  generateAISummary 
} from '@/lib/openai/translate';
import { Lang, SUPPORTED_LANGS } from '@/types/lang';

/**
 * POST /api/admin/translate
 * 
 * 汎用翻訳エンドポイント
 * 
 * リクエストボディ:
 * {
 *   type: 'text' | 'batch' | 'article' | 'faqs' | 'aiSummary',
 *   targetLang: Lang,
 *   data: any
 * }
 */
export async function POST(request: NextRequest) {
  const adminCtx = await requireAdmin(request);
  if (adminCtx instanceof NextResponse) return adminCtx;

  try {
    const body = await request.json();
    const { type, targetLang, data, context } = body;

    // 言語検証
    if (!SUPPORTED_LANGS.includes(targetLang)) {
      return NextResponse.json(
        { error: '無効な言語が指定されました' },
        { status: 400 }
      );
    }

    // タイプ別処理
    switch (type) {
      case 'text': {
        // 単一テキスト翻訳
        const { text } = data;
        if (!text) {
          return NextResponse.json(
            { error: 'テキストが指定されていません' },
            { status: 400 }
          );
        }

        const translated = await translateText(text, targetLang, context);
        return NextResponse.json({ translated });
      }

      case 'batch': {
        // バッチ翻訳
        const { texts } = data;
        if (!texts || typeof texts !== 'object') {
          return NextResponse.json(
            { error: '翻訳するテキストが指定されていません' },
            { status: 400 }
          );
        }

        const translated = await translateBatch(texts, targetLang, context);
        return NextResponse.json({ translated });
      }

      case 'article': {
        // 記事全体翻訳
        const { title, content, excerpt, metaTitle, metaDescription } = data;
        if (!title || !content) {
          return NextResponse.json(
            { error: 'タイトルまたは本文が指定されていません' },
            { status: 400 }
          );
        }

        const translated = await translateArticle(
          { title, content, excerpt, metaTitle, metaDescription },
          targetLang
        );
        return NextResponse.json({ translated });
      }

      case 'faqs': {
        // FAQ翻訳
        const { faqs } = data;
        if (!Array.isArray(faqs)) {
          return NextResponse.json(
            { error: 'FAQが配列形式ではありません' },
            { status: 400 }
          );
        }

        const translated = await translateFAQs(faqs, targetLang);
        return NextResponse.json({ translated });
      }

      case 'aiSummary': {
        // AIサマリー生成
        const { content } = data;
        if (!content) {
          return NextResponse.json(
            { error: '本文が指定されていません' },
            { status: 400 }
          );
        }

        const summary = await generateAISummary(content, targetLang);
        return NextResponse.json({ summary });
      }

      default:
        return NextResponse.json(
          { error: '無効な翻訳タイプが指定されました' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Translation API Error]:', error);
    return NextResponse.json(
      { 
        error: '翻訳処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/translate/status
 * 
 * 翻訳APIの状態確認
 */
export async function GET(request: NextRequest) {
  const adminCtx = await requireAdmin(request);
  if (adminCtx instanceof NextResponse) return adminCtx;

  const hasApiKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? 'ready' : 'not_configured',
    supportedLanguages: SUPPORTED_LANGS,
    message: hasApiKey 
      ? '翻訳APIは正常に動作しています' 
      : 'OPENAI_API_KEYが設定されていません',
  });
}

