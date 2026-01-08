import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * 既存のhomeページ（トップページ設定）をチェックするAPI
 */
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    // homeスラッグのページを検索
    const pagesSnapshot = await adminDb
      .collection('pages')
      .where('mediaId', '==', mediaId)
      .where('slug', '==', 'home')
      .limit(1)
      .get();

    if (pagesSnapshot.empty) {
      return NextResponse.json({ 
        exists: false,
        homePage: null 
      });
    }

    const doc = pagesSnapshot.docs[0];
    const data = doc.data();
    
    return NextResponse.json({
      exists: true,
      homePage: {
        id: doc.id,
        title: data.title,
        slug: data.slug,
      }
    });
  } catch (error) {
    console.error('[API check-home] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 既存のhomeページのスラッグを変更するAPI
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { pageId, newSlug } = body;

    if (!pageId || !newSlug) {
      return NextResponse.json({ error: 'pageId and newSlug are required' }, { status: 400 });
    }

    // 新しいスラッグが既に使用されていないかチェック
    const existingPageSnapshot = await adminDb
      .collection('pages')
      .where('mediaId', '==', mediaId)
      .where('slug', '==', newSlug)
      .limit(1)
      .get();

    if (!existingPageSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Slug already exists',
        message: `スラッグ「${newSlug}」は既に使用されています。`
      }, { status: 409 });
    }

    // 既存のhomeページのスラッグを変更
    await adminDb.collection('pages').doc(pageId).update({
      slug: newSlug,
      isHomePage: false,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `スラッグを「${newSlug}」に変更しました。`
    });
  } catch (error) {
    console.error('[API check-home POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
