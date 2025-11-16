import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// ライティング特徴取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('writingStyles').doc(params.id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Writing style not found' }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    });
  } catch (error) {
    console.error('[API /admin/writing-styles/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch writing style' },
      { status: 500 }
    );
  }
}

// ライティング特徴更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, prompt } = body;

    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      );
    }

    const updateData = {
      name,
      description: description || '',
      prompt,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('writingStyles').doc(params.id).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /admin/writing-styles/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update writing style' },
      { status: 500 }
    );
  }
}

// ライティング特徴削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await adminDb.collection('writingStyles').doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /admin/writing-styles/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete writing style' },
      { status: 500 }
    );
  }
}

