import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    // クエリを作成
    let articlesQuery: FirebaseFirestore.Query = adminDb.collection('articles');
    let categoriesQuery: FirebaseFirestore.Query = adminDb.collection('categories');
    let tagsQuery: FirebaseFirestore.Query = adminDb.collection('tags');
    
    // mediaIdが指定されている場合はフィルタリング
    if (mediaId) {
      articlesQuery = articlesQuery.where('mediaId', '==', mediaId);
      categoriesQuery = categoriesQuery.where('mediaId', '==', mediaId);
      tagsQuery = tagsQuery.where('mediaId', '==', mediaId);
    }
    
    const [articlesSnap, categoriesSnap, tagsSnap] = await Promise.all([
      articlesQuery.get(),
      categoriesQuery.get(),
      tagsQuery.get(),
    ]);

    const stats = {
      articlesCount: articlesSnap.size,
      categoriesCount: categoriesSnap.size,
      tagsCount: tagsSnap.size,
    };
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

