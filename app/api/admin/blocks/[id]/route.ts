import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// ブロック取得
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Block Get] 取得開始:', params.id);
    
    const doc = await adminDb.collection('blocks').doc(params.id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }
    
    const data = doc.data();
    const block = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.() || new Date(),
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
    };
    
    console.log('[API Block Get] 取得成功');
    
    return NextResponse.json(block);
  } catch (error: any) {
    console.error('[API Block Get] エラー:', error);
    return NextResponse.json({ error: 'Failed to get block' }, { status: 500 });
  }
}

// ブロック更新
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Block Update] 更新開始:', params.id);
    
    const body = await request.json();
    const updateData: any = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('blocks').doc(params.id).update(updateData);
    
    console.log('[API Block Update] 更新成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Block Update] エラー:', error);
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
  }
}

// ブロック削除
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Block Delete] 削除開始:', params.id);
    
    await adminDb.collection('blocks').doc(params.id).delete();
    
    console.log('[API Block Delete] 削除成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Block Delete] エラー:', error);
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
  }
}

