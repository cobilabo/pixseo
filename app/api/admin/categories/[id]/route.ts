import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log('[API PUT /admin/categories/:id] Updating category:', { id, body });
    
    // Firestoreのカテゴリーを取得
    const categoryRef = adminDb.collection('categories').doc(id);
    const categoryDoc = await categoryRef.get();
    
    if (!categoryDoc.exists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    // 更新データを準備（送信されたフィールドのみ）
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isRecommended !== undefined) updateData.isRecommended = body.isRecommended;
    if (body.order !== undefined) updateData.order = body.order;
    
    // 更新日時を追加
    updateData.updatedAt = new Date();
    
    // Firestoreを更新
    await categoryRef.update(updateData);
    
    console.log('[API PUT /admin/categories/:id] Category updated successfully');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API PUT /admin/categories/:id] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to update category',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

