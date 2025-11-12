import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// ブロックの並び替え
export async function POST(request: Request) {
  try {
    console.log('[API Blocks Reorder] 並び替え開始');
    
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid updates format' }, { status: 400 });
    }

    // バッチ更新
    const batch = adminDb.batch();
    
    updates.forEach((update: { id: string; order: number }) => {
      const docRef = adminDb.collection('blocks').doc(update.id);
      batch.update(docRef, { order: update.order });
    });

    await batch.commit();
    
    console.log('[API Blocks Reorder] 並び替え成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Blocks Reorder] エラー:', error);
    return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 });
  }
}

