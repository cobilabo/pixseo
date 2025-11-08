import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// バナー取得
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Banner Get] 取得開始:', params.id);
    
    const doc = await adminDb.collection('banners').doc(params.id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }
    
    const data = doc.data();
    const banner = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.() || new Date(),
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
    };
    
    console.log('[API Banner Get] 取得成功');
    
    return NextResponse.json(banner);
  } catch (error: any) {
    console.error('[API Banner Get] エラー:', error);
    return NextResponse.json({ error: 'Failed to get banner' }, { status: 500 });
  }
}

// バナー更新
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Banner Update] 更新開始:', params.id);
    
    const body = await request.json();
    const updateData: any = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('banners').doc(params.id).update(updateData);
    
    console.log('[API Banner Update] 更新成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Banner Update] エラー:', error);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

// バナー削除
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Banner Delete] 削除開始:', params.id);
    
    await adminDb.collection('banners').doc(params.id).delete();
    
    console.log('[API Banner Delete] 削除成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Banner Delete] エラー:', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}

