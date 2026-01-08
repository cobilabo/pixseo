import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Category } from '@/types/article';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    let categoriesRef = adminDb.collection('categories');
    
    // mediaIdが指定されている場合はフィルタリング
    let query: FirebaseFirestore.Query = categoriesRef;
    if (mediaId) {
      query = categoriesRef.where('mediaId', '==', mediaId);
    }
    
    // orderByを削除（クライアント側でソート）
    const snapshot = await query.get();

    const categories: Category[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      slug: doc.data().slug,
      description: doc.data().description || '',
      imageUrl: doc.data().imageUrl || '',
      imageAlt: doc.data().imageAlt || '',
      mediaId: doc.data().mediaId,
      isRecommended: doc.data().isRecommended || false,
      order: doc.data().order || 0,
    }));
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('[API /admin/categories] Error:', error);
    console.error('[API /admin/categories] Error message:', error?.message);
    console.error('[API /admin/categories] Error code:', error?.code);
    return NextResponse.json({ 
      error: 'Failed to fetch categories',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

