import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  generateSlugFallbackFromTitle,
  normalizeOpenAISlugOutput,
} from '@/lib/generate-slug';

export const dynamic = 'force-dynamic';

const DEFAULT_SLUG_MODEL = 'gpt-4o-mini';
const MAX_OPENAI_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** OpenAI の Retry-After（秒）をミリ秒で解釈（上限あり） */
function parseRetryAfterMs(res: Response): number | null {
  const ra = res.headers.get('retry-after');
  if (!ra) return null;
  const sec = parseInt(ra, 10);
  if (Number.isNaN(sec) || sec < 0) return null;
  return Math.min(sec * 1000, 60_000);
}

/**
 * OpenAI APIを使用して日本語タイトルから英語のスラッグを生成
 * 同じmediaId内でスラッグの重複チェックを行い、重複していたら連番を追加
 *
 * 429 対策: バックオフで再試行 → それでも失敗時はフォールバックスラッグ（usedFallback: true）
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { title, currentArticleId } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const model =
      process.env.OPENAI_ARTICLE_SLUG_MODEL?.trim() || DEFAULT_SLUG_MODEL;

    let openaiSlug: string | null = null;

    for (let attempt = 0; attempt < MAX_OPENAI_ATTEMPTS; attempt++) {
      const openaiResponse = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'あなたはSEOに強い専門家です。日本語のタイトルを、SEOに最適化された短く簡潔な英語のURLスラッグに変換してください。スラッグは小文字のみを使用し、単語間はハイフン(-)で区切ってください。最大5単語以内に収めてください。',
              },
              {
                role: 'user',
                content: `以下の日本語タイトルを、SEOに最適化された短く簡潔な英語のURLスラッグに変換してください。\n\nタイトル: ${title}\n\nスラッグのみを出力してください（説明は不要）。`,
              },
            ],
            temperature: 0.3,
            max_tokens: 100,
          }),
        }
      );

      if (openaiResponse.ok) {
        const openaiData = await openaiResponse.json();
        const raw =
          openaiData.choices?.[0]?.message?.content?.trim() || '';
        const normalized = normalizeOpenAISlugOutput(raw);
        if (normalized) {
          openaiSlug = normalized;
        }
        break;
      }

      if (
        openaiResponse.status === 429 &&
        attempt < MAX_OPENAI_ATTEMPTS - 1
      ) {
        const fromHeader = parseRetryAfterMs(openaiResponse);
        const backoff = Math.min(12_000, 1000 * Math.pow(2, attempt));
        await sleep(fromHeader ?? backoff);
        continue;
      }

      if (
        openaiResponse.status === 401 ||
        openaiResponse.status === 403
      ) {
        const errorData = await openaiResponse.text();
        console.error('[OpenAI API Auth Error]', errorData);
        return NextResponse.json(
          {
            error: 'OpenAI API authentication failed',
            details: errorData,
          },
          { status: openaiResponse.status }
        );
      }

      const errorData = await openaiResponse.text();
      console.error('[OpenAI API Error]', openaiResponse.status, errorData);
      break;
    }

    let usedFallback = false;
    let slug = openaiSlug;
    if (!slug) {
      slug = generateSlugFallbackFromTitle(title, 'post');
      usedFallback = true;
    }

    const existingArticlesSnapshot = await adminDb
      .collection('articles')
      .where('mediaId', '==', mediaId)
      .get();

    const existingSlugs = existingArticlesSnapshot.docs
      .filter((doc) => doc.id !== currentArticleId)
      .map((doc) => doc.data().slug);

    let finalSlug = slug;
    let counter = 2;

    while (existingSlugs.includes(finalSlug)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return NextResponse.json({
      slug: finalSlug,
      ...(usedFallback ? { usedFallback: true } : {}),
    });
  } catch (error) {
    console.error('[API /admin/articles/generate-slug] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate slug',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
