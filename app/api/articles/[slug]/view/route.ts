import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * 記事の閲覧数をカウントアップ
 * POST /api/articles/[slug]/view
 * 
 * カスタムドメインからのアクセスのみカウント（プレビューサイトは除外）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }
    
    // リクエストボディからmediaIdを取得
    const body = await request.json().catch(() => ({}));
    const { mediaId } = body;
    
    // 記事を検索
    let query = adminDb.collection('articles').where('slug', '==', slug);
    
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId) as any;
    }
    
    const snapshot = await query.limit(1).get();
    
    if (snapshot.empty) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    const doc = snapshot.docs[0];
    
    // viewCountをインクリメント
    await adminDb.collection('articles').doc(doc.id).update({
      viewCount: FieldValue.increment(1),
    });
    
    const currentViewCount = (doc.data().viewCount || 0) + 1;
    
    console.log(`[View Count] Article "${slug}" view count incremented to ${currentViewCount}`);
    
    return NextResponse.json({ 
      success: true,
      viewCount: currentViewCount,
    });
    
  } catch (error) {
    console.error('[View Count] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update view count' },
      { status: 500 }
    );
  }
}

