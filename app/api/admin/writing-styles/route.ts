import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { WritingStyle } from '@/types/writing-style';

export const dynamic = 'force-dynamic';

// ライティング特徴一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const url = new URL(request.url);
    const writerId = url.searchParams.get('writerId');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    let query = adminDb
      .collection('writingStyles')
      .where('mediaId', '==', mediaId);

    // ライターIDでフィルタ（オプション）
    if (writerId) {
      query = query.where('writerId', '==', writerId);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const styles: WritingStyle[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as WritingStyle[];

    return NextResponse.json({ styles });
  } catch (error) {
    console.error('[API /admin/writing-styles] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch writing styles' },
      { status: 500 }
    );
  }
}

// ライティング特徴作成
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { writerId, name, description, prompt } = body;

    if (!writerId || !name || !prompt) {
      return NextResponse.json(
        { error: 'WriterId, name, and prompt are required' },
        { status: 400 }
      );
    }

    const styleData = {
      writerId,
      name,
      description: description || '',
      prompt,
      mediaId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('writingStyles').add(styleData);

    return NextResponse.json({ id: docRef.id, ...styleData }, { status: 201 });
  } catch (error) {
    console.error('[API /admin/writing-styles] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create writing style' },
      { status: 500 }
    );
  }
}

