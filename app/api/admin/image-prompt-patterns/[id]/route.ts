import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// 画像プロンプトパターン取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('imagePromptPatterns').doc(params.id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    });
  } catch (error) {
    console.error('[API /admin/image-prompt-patterns/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image prompt pattern' },
      { status: 500 }
    );
  }
}

// 画像プロンプトパターン更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, prompt, size } = body;

    if (!name || !prompt || !size) {
      return NextResponse.json(
        { error: 'Name, prompt, and size are required' },
        { status: 400 }
      );
    }

    const updateData = {
      name,
      description: description || '',
      prompt,
      size,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('imagePromptPatterns').doc(params.id).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /admin/image-prompt-patterns/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update image prompt pattern' },
      { status: 500 }
    );
  }
}

// 画像プロンプトパターン削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await adminDb.collection('imagePromptPatterns').doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /admin/image-prompt-patterns/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image prompt pattern' },
      { status: 500 }
    );
  }
}

