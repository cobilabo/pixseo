import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// メディア一覧取得
export async function GET() {
  try {
    console.log('[API Media] メディア一覧取得開始');
    
    const snapshot = await adminDb.collection('media').orderBy('createdAt', 'desc').get();
    
    const media = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    console.log('[API Media] 取得したメディア数:', media.length);
    
    return NextResponse.json(media);
  } catch (error: any) {
    console.error('[API Media] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

