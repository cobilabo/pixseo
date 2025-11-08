import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const SETTINGS_DOC_ID = 'site';

// サイト設定取得
export async function GET() {
  try {
    console.log('[API Site] サイト設定取得開始');
    
    const doc = await adminDb.collection('settings').doc(SETTINGS_DOC_ID).get();
    
    if (!doc.exists) {
      // デフォルト値を返す
      return NextResponse.json({
        siteName: 'ふらっと。',
        siteDescription: '',
        logoUrl: '',
      });
    }
    
    const data = doc.data();
    console.log('[API Site] 設定取得成功');
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Site] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch site settings' }, { status: 500 });
  }
}

// サイト設定更新
export async function PUT(request: Request) {
  try {
    console.log('[API Site] サイト設定更新開始');
    
    const body = await request.json();
    const { siteName, siteDescription, logoUrl } = body;

    const updateData = {
      siteName,
      siteDescription,
      logoUrl,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('settings').doc(SETTINGS_DOC_ID).set(updateData, { merge: true });
    
    console.log('[API Site] 設定更新成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Site] エラー:', error);
    return NextResponse.json({ error: 'Failed to update site settings' }, { status: 500 });
  }
}

