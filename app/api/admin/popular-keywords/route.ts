import { NextRequest, NextResponse } from 'next/server';
import {
  getAggregatedPopularKeywords,
  setPopularKeywordApproval,
  removePopularKeywordApproval,
} from '@/lib/firebase/popular-keywords-server';
import { revalidatePopularKeywords } from '@/lib/cache-manager';
import { PopularKeywordStatus } from '@/types/search';

export const dynamic = 'force-dynamic';

function parseStatus(value: string | null): PopularKeywordStatus | 'all' {
  if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'all') {
    return value;
  }
  return 'all';
}

function parseInteger(value: string | null, fallback: number, min = 0): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < min) return fallback;
  return n;
}

// GET: 集計済みキーワード一覧を取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    if (!mediaId) {
      return NextResponse.json(
        { error: 'サービスが選択されていません' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInteger(searchParams.get('days'), 30, 0);
    const status = parseStatus(searchParams.get('status'));
    const limit = parseInteger(searchParams.get('limit'), 0, 0);

    const { items, counts } = await getAggregatedPopularKeywords(mediaId, {
      days,
      status,
      limit: limit > 0 ? limit : undefined,
    });

    return NextResponse.json({ items, counts });
  } catch (error: any) {
    console.error('[API /admin/popular-keywords GET] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'よく検索されているキーワードの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PATCH: キーワードの承認状態を更新
export async function PATCH(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    if (!mediaId) {
      return NextResponse.json(
        { error: 'サービスが選択されていません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { value, displayName, status, decidedBy } = body as {
      value?: string;
      displayName?: string;
      status?: PopularKeywordStatus;
      decidedBy?: string;
    };

    if (!value || !value.trim()) {
      return NextResponse.json({ error: 'value は必須です' }, { status: 400 });
    }
    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      return NextResponse.json({ error: '無効な status です' }, { status: 400 });
    }

    if (status === 'pending') {
      await removePopularKeywordApproval(mediaId, value);
    } else {
      await setPopularKeywordApproval(
        mediaId,
        value,
        displayName || value,
        status,
        decidedBy || 'unknown'
      );
    }

    revalidatePopularKeywords();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/popular-keywords PATCH] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'よく検索されているキーワードの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: 一括更新（複数キーワードを一度に承認/拒否/未承認に戻す）
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    if (!mediaId) {
      return NextResponse.json(
        { error: 'サービスが選択されていません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { items, status, decidedBy } = body as {
      items?: Array<{ value: string; displayName?: string }>;
      status?: PopularKeywordStatus;
      decidedBy?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items は必須です' }, { status: 400 });
    }
    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      return NextResponse.json({ error: '無効な status です' }, { status: 400 });
    }

    await Promise.all(
      items
        .filter((it) => it?.value && it.value.trim())
        .map(async (it) => {
          if (status === 'pending') {
            await removePopularKeywordApproval(mediaId, it.value);
          } else {
            await setPopularKeywordApproval(
              mediaId,
              it.value,
              it.displayName || it.value,
              status,
              decidedBy || 'unknown'
            );
          }
        })
    );

    revalidatePopularKeywords();

    return NextResponse.json({ success: true, updated: items.length });
  } catch (error: any) {
    console.error('[API /admin/popular-keywords POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || '一括更新に失敗しました' },
      { status: 500 }
    );
  }
}
