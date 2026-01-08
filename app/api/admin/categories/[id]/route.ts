import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    // Firestoreのカテゴリーを取得
    const categoryRef = adminDb.collection('categories').doc(id);
    const categoryDoc = await categoryRef.get();
    
    if (!categoryDoc.exists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    // 更新データを準備（送信されたフィールドのみ）
    const updateData: any = {};
    
    if (body.name !== undefined) {
      updateData.name = body.name;
      updateData.name_ja = body.name;
      
      // 他言語へ翻訳
      const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
      for (const lang of otherLangs) {
        try {
          updateData[`name_${lang}`] = await translateText(body.name, lang, 'カテゴリー名');
        } catch (error) {
          console.error(`[Category Translation Error] ${lang}:`, error);
          updateData[`name_${lang}`] = body.name;
        }
      }
    }
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) {
      updateData.description = body.description;
      updateData.description_ja = body.description;
      
      // 他言語へ翻訳
      const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
      for (const lang of otherLangs) {
        try {
          updateData[`description_${lang}`] = await translateText(body.description, lang, 'カテゴリー説明文');
        } catch (error) {
          console.error(`[Category Translation Error] ${lang}:`, error);
          updateData[`description_${lang}`] = body.description;
        }
      }
    }
    if (body.isRecommended !== undefined) updateData.isRecommended = body.isRecommended;
    if (body.order !== undefined) updateData.order = body.order;
    
    // 更新日時を追加
    updateData.updatedAt = new Date();
    
    // Firestoreを更新
    await categoryRef.update(updateData);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API PUT /admin/categories/:id] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to update category',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

