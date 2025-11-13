import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// ブロック一覧取得
export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    
    console.log('[API Blocks] ブロック一覧取得開始', { mediaId });
    
    let query: FirebaseFirestore.Query = adminDb.collection('blocks');
    
    // mediaIdが指定されている場合はフィルタリング
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await query.orderBy('order').get();
    
    const blocks = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });

    console.log('[API Blocks] 取得したブロック数:', blocks.length);
    
    return NextResponse.json(blocks);
  } catch (error: any) {
    console.error('[API Blocks] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
  }
}

// ブロック作成
export async function POST(request: Request) {
  try {
    console.log('[API Blocks] ブロック作成開始');
    
    const body = await request.json();
    const { title, imageUrl, linkUrl, placement, layoutTheme, isActive, mediaId } = body;

    if (!title || !imageUrl) {
      return NextResponse.json({ error: 'Title and image URL are required' }, { status: 400 });
    }

    if (!placement) {
      return NextResponse.json({ error: 'Placement is required' }, { status: 400 });
    }

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    // 現在の最大order値を取得（同じmediaId + placement内で）
    const snapshot = await adminDb.collection('blocks')
      .where('mediaId', '==', mediaId)
      .where('placement', '==', placement)
      .orderBy('order', 'desc')
      .limit(1)
      .get();
    const maxOrder = snapshot.empty ? 0 : (snapshot.docs[0].data().order || 0);

    const blockData = {
      mediaId,
      title,
      imageUrl,
      linkUrl: linkUrl || '',
      placement,
      layoutTheme: layoutTheme || 'cobi',
      order: maxOrder + 1,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('blocks').add(blockData);
    
    console.log('[API Blocks] ブロック作成成功:', docRef.id);
    
    return NextResponse.json({ id: docRef.id });
  } catch (error: any) {
    console.error('[API Blocks] エラー:', error);
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
  }
}

