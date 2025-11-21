import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * スラッグ重複チェックAPI
 * 
 * GET /api/admin/articles/check-slug?mediaId={mediaId}&slug={slug}&excludeId={articleId}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    const slug = searchParams.get('slug');
    const excludeId = searchParams.get('excludeId'); // 編集時に自分自身を除外

    if (!mediaId || !slug) {
      return NextResponse.json(
        { error: 'mediaId and slug are required' },
        { status: 400 }
      );
    }

    // Firestore で同じ mediaId + slug を持つ記事を検索
    let query = adminDb
      .collection('articles')
      .where('mediaId', '==', mediaId)
      .where('slug', '==', slug)
      .limit(1);

    const snapshot = await query.get();

    // 編集時: 自分自身を除外
    if (excludeId) {
      const duplicates = snapshot.docs.filter(doc => doc.id !== excludeId);
      return NextResponse.json({
        isDuplicate: duplicates.length > 0,
        duplicateId: duplicates.length > 0 ? duplicates[0].id : null,
      });
    }

    // 新規作成時
    return NextResponse.json({
      isDuplicate: !snapshot.empty,
      duplicateId: !snapshot.empty ? snapshot.docs[0].id : null,
    });
  } catch (error) {
    console.error('[check-slug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check slug' },
      { status: 500 }
    );
  }
}

