import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// メディア一覧取得
export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    
    console.log('[API Media] メディア一覧取得開始', { mediaId });
    
    let query: FirebaseFirestore.Query = adminDb.collection('media');
    
    // mediaIdが指定されている場合はフィルタリング
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId);
    }
    
    // orderByはクライアント側で行う（複合インデックスを避けるため）
    const snapshot = await query.get();
    
    const media = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    // クライアント側でソートする代わりに、ここでソート
    media.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('[API Media] 取得したメディア数:', media.length);
    
    return NextResponse.json(media);
  } catch (error: any) {
    console.error('[API Media] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

