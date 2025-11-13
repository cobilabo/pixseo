import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { defaultTheme } from '@/types/theme';

export const dynamic = 'force-dynamic';

// GET: デザイン設定を取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'サービスが選択されていません' },
        { status: 400 }
      );
    }

    const tenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
    
    if (!tenantDoc.exists) {
      return NextResponse.json(
        { error: 'サービスが見つかりません' },
        { status: 404 }
      );
    }

    const data = tenantDoc.data();
    
    // themeが存在しない場合はデフォルトテーマを返す
    const theme = data?.theme || defaultTheme;
    
    return NextResponse.json({ theme });
  } catch (error: any) {
    console.error('[API /admin/design] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch design settings' },
      { status: 500 }
    );
  }
}

// PUT: デザイン設定を更新
export async function PUT(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'サービスが選択されていません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { theme } = body;

    if (!theme) {
      return NextResponse.json(
        { error: 'テーマデータが必要です' },
        { status: 400 }
      );
    }

    await adminDb.collection('mediaTenants').doc(mediaId).update({
      theme,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ 
      message: 'デザイン設定を更新しました',
      theme 
    });
  } catch (error: any) {
    console.error('[API /admin/design] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update design settings' },
      { status: 500 }
    );
  }
}

