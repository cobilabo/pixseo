import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// フォーム一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const formsSnapshot = await adminDb
      .collection('forms')
      .where('mediaId', '==', mediaId)
      .get();

    const forms = formsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));

    return NextResponse.json(forms);
  } catch (error) {
    console.error('[API] Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

// フォーム作成
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const formData: any = {
      name: body.name,
      description: body.description || '',
      fields: body.fields || [],
      isActive: body.isActive !== undefined ? body.isActive : true,
      emailNotification: body.emailNotification || { enabled: false, to: [], subject: '' },
      afterSubmit: body.afterSubmit || { type: 'message', message: 'お問い合わせありがとうございます。' },
      submissionCount: 0,
      mediaId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('forms').add(formData);

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}

