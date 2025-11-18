import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * 想定読者履歴の取得・追加
 */

// GET: 想定読者履歴の取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    // メディアごとの想定読者履歴を取得
    const docRef = adminDb.collection('targetAudienceHistory').doc(mediaId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ history: [] });
    }

    const data = doc.data();
    const history = data?.history || [];

    // 重複を削除し、最新20件のみ返す
    const uniqueHistory = Array.from(new Set(history)).slice(0, 20);

    return NextResponse.json({ history: uniqueHistory });
  } catch (error) {
    console.error('[Target Audience History GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch target audience history' },
      { status: 500 }
    );
  }
}

// POST: 想定読者履歴に追加
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { targetAudience } = body;

    if (!mediaId || !targetAudience) {
      return NextResponse.json(
        { error: 'Media ID and target audience are required' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('targetAudienceHistory').doc(mediaId);
    const doc = await docRef.get();

    if (!doc.exists) {
      // 新規作成
      await docRef.set({
        mediaId,
        history: [targetAudience],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // 既存の履歴に追加（重複チェック）
      const data = doc.data();
      const history = data?.history || [];

      if (!history.includes(targetAudience)) {
        // 最新のものを先頭に追加し、最大20件に制限
        const newHistory = [targetAudience, ...history].slice(0, 20);
        await docRef.update({
          history: newHistory,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Target Audience History POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add target audience to history' },
      { status: 500 }
    );
  }
}

