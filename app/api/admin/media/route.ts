import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// メディア一覧取得（使用状況は別APIで取得）
// 注: Firestore側 orderBy + where を使うと複合インデックスが必須になるため、
//     mediaId フィルタのみで全件取得し、ソートはクライアント側で行う。
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    let query1: FirebaseFirestore.Query = adminDb.collection('media');
    let query2: FirebaseFirestore.Query = adminDb.collection('mediaLibrary');

    if (mediaId) {
      query1 = query1.where('mediaId', '==', mediaId);
      query2 = query2.where('mediaId', '==', mediaId);
    }

    const [snapshot1, snapshot2] = await Promise.all([
      query1.get(),
      query2.get(),
    ]);

    const allDocs = [...snapshot1.docs, ...snapshot2.docs];

    const mediaList = allDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    mediaList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(mediaList);
  } catch (error: any) {
    console.error('[API Media] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
