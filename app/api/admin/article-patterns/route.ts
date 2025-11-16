import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ArticlePattern } from '@/types/article-pattern';

export const dynamic = 'force-dynamic';

// 構成パターン一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection('articlePatterns')
      .where('mediaId', '==', mediaId)
      .get();
    
    // クライアント側でソート（インデックス不要）
    const sortedDocs = snapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis() || 0;
      const bTime = b.data().createdAt?.toMillis() || 0;
      return bTime - aTime;
    });

    const patterns: ArticlePattern[] = sortedDocs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ArticlePattern[];

    return NextResponse.json({ patterns });
  } catch (error) {
    console.error('[API /admin/article-patterns] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article patterns' },
      { status: 500 }
    );
  }
}

// 構成パターン作成
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, prompt } = body;

    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      );
    }

    const patternData = {
      name,
      description: description || '',
      prompt,
      mediaId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('articlePatterns').add(patternData);

    return NextResponse.json({ id: docRef.id, ...patternData }, { status: 201 });
  } catch (error) {
    console.error('[API /admin/article-patterns] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create article pattern' },
      { status: 500 }
    );
  }
}

