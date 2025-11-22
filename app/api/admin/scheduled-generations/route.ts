import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ScheduledGeneration } from '@/types/scheduled-generation';

export const dynamic = 'force-dynamic';

// 定期実行設定一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection('scheduledGenerations')
      .where('mediaId', '==', mediaId)
      .get();
    
    // クライアント側でソート（インデックス不要）
    const sortedDocs = snapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis() || 0;
      const bTime = b.data().createdAt?.toMillis() || 0;
      return bTime - aTime;
    });

    const schedules: ScheduledGeneration[] = sortedDocs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastExecutedAt: doc.data().lastExecutedAt?.toDate(),
      nextExecutionAt: doc.data().nextExecutionAt?.toDate(),
    })) as ScheduledGeneration[];

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('[API /admin/scheduled-generations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled generations' },
      { status: 500 }
    );
  }
}

// 定期実行設定作成
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

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

    const scheduleData = {
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
      mediaId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('scheduledGenerations').add(scheduleData);

    return NextResponse.json({ id: docRef.id, ...scheduleData }, { status: 201 });
  } catch (error) {
    console.error('[API /admin/scheduled-generations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled generation' },
      { status: 500 }
    );
  }
}

