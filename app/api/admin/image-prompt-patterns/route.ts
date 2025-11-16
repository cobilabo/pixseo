import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ImagePromptPattern } from '@/types/image-prompt-pattern';

export const dynamic = 'force-dynamic';

// 画像プロンプトパターン一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection('imagePromptPatterns')
      .where('mediaId', '==', mediaId)
      .orderBy('createdAt', 'desc')
      .get();

    const patterns: ImagePromptPattern[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ImagePromptPattern[];

    return NextResponse.json({ patterns });
  } catch (error) {
    console.error('[API /admin/image-prompt-patterns] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image prompt patterns' },
      { status: 500 }
    );
  }
}

// 画像プロンプトパターン作成
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, prompt, size } = body;

    if (!name || !prompt || !size) {
      return NextResponse.json(
        { error: 'Name, prompt, and size are required' },
        { status: 400 }
      );
    }

    const patternData = {
      name,
      description: description || '',
      prompt,
      size,
      mediaId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('imagePromptPatterns').add(patternData);

    return NextResponse.json({ id: docRef.id, ...patternData }, { status: 201 });
  } catch (error) {
    console.error('[API /admin/image-prompt-patterns] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create image prompt pattern' },
      { status: 500 }
    );
  }
}

