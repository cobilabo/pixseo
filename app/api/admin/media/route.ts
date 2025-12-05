import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// メディア一覧取得（高速版：使用数は計算しない）
export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    
    console.log('[API Media] メディア一覧取得開始', { mediaId });
    
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
    console.log('[API Media] 取得したドキュメント数:', {
      media: snapshot1.docs.length,
      mediaLibrary: snapshot2.docs.length,
      total: allDocs.length,
    });
    
    // メディアデータをマッピング（使用数の計算は省略して高速化）
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

    console.log('[API Media] 取得したメディア数:', mediaList.length);
    
    return NextResponse.json(mediaList);
  } catch (error: any) {
    console.error('[API Media] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

