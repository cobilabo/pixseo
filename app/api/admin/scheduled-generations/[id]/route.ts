import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// 定期実行設定取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('scheduledGenerations').doc(params.id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      lastExecutedAt: data.lastExecutedAt?.toDate(),
      nextExecutionAt: data.nextExecutionAt?.toDate(),
    });
  } catch (error) {
    console.error('[API /admin/scheduled-generations/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled generation' },
      { status: 500 }
    );
  }
}

// 定期実行設定更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      name,
      categoryId,
      patternId,
      writerId,
      imagePromptPatternId,
      targetAudience,
      daysOfWeek,
      timeOfDay,
      timezone,
      isActive,
    } = body;

    if (!name || !categoryId || !patternId || !writerId || !imagePromptPatternId || !targetAudience || !daysOfWeek || !timeOfDay || !timezone) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    const updateData = {
      name,
      categoryId,
      patternId,
      writerId,
      imagePromptPatternId,
      targetAudience,
      daysOfWeek,
      timeOfDay,
      timezone,
      isActive: isActive ?? true,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('scheduledGenerations').doc(params.id).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /admin/scheduled-generations/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled generation' },
      { status: 500 }
    );
  }
}

// 定期実行設定削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await adminDb.collection('scheduledGenerations').doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /admin/scheduled-generations/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled generation' },
      { status: 500 }
    );
  }
}

