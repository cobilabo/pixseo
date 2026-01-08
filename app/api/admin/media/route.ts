import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// メディア一覧取得（高速版：使用状況は別APIで取得）
export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    // 両方のコレクションから取得（media と mediaLibrary）
    let query1: FirebaseFirestore.Query = adminDb.collection('media');
    let query2: FirebaseFirestore.Query = adminDb.collection('mediaLibrary');
    
    // mediaIdが指定されている場合はフィルタリング
    if (mediaId) {
      query1 = query1.where('mediaId', '==', mediaId);
      query2 = query2.where('mediaId', '==', mediaId);
    }
    
    // orderByはクライアント側で行う（複合インデックスを避けるため）
    const [snapshot1, snapshot2] = await Promise.all([
      query1.get(),
      query2.get(),
    ]);
    
    // 両方のスナップショットをマージ
    const allDocs = [...snapshot1.docs, ...snapshot2.docs];
    // メディアデータをマッピング（使用状況は別APIで取得するため省略）
    const mediaList = allDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    // 作成日時で降順ソート
    mediaList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(mediaList);
  } catch (error: any) {
    console.error('[API Media] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

