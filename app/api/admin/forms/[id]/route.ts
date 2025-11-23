import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// フォーム取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('forms').doc(params.id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const data = doc.data()!;

    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    });
  } catch (error) {
    console.error('[API] Error fetching form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

// フォーム更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updateData: any = {
      updatedAt: new Date(),
    };

    // 更新可能なフィールド
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.fields !== undefined) updateData.fields = body.fields;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.emailNotification !== undefined) updateData.emailNotification = body.emailNotification;
    if (body.afterSubmit !== undefined) updateData.afterSubmit = body.afterSubmit;

    await adminDb.collection('forms').doc(params.id).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating form:', error);
    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    );
  }
}

// フォーム削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // フォームの送信データも削除
    const submissionsSnapshot = await adminDb
      .collection('formSubmissions')
      .where('formId', '==', params.id)
      .get();

    const batch = adminDb.batch();
    
    submissionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.delete(adminDb.collection('forms').doc(params.id));

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}

