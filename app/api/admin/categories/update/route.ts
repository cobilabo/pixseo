import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

/**
 * カテゴリー更新API（翻訳処理付き）
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, slug, description, imageUrl, imageAlt, isRecommended, order, mediaId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // カテゴリーの存在確認
    const categoryRef = adminDb.collection('categories').doc(id);
    const categoryDoc = await categoryRef.get();

    if (!categoryDoc.exists) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // 更新データを準備
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 変更があったフィールドのみ更新
    if (name !== undefined) {
      updateData.name = name;
      updateData.name_ja = name;

      // 他言語へ翻訳
      const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
      for (const lang of otherLangs) {
        try {
          updateData[`name_${lang}`] = await translateText(name, lang, 'カテゴリー名');
        } catch (error) {
          console.error(`[Category Name Translation Error] ${lang}:`, error);
          updateData[`name_${lang}`] = name;
        }
      }
    }

    if (description !== undefined) {
      updateData.description = description;
      updateData.description_ja = description;

      // 他言語へ翻訳
      const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
      for (const lang of otherLangs) {
        try {
          if (description) {
            updateData[`description_${lang}`] = await translateText(description, lang, 'カテゴリー説明文');
          } else {
            updateData[`description_${lang}`] = '';
          }
        } catch (error) {
          console.error(`[Category Description Translation Error] ${lang}:`, error);
          updateData[`description_${lang}`] = description || '';
        }
      }
    }

    if (slug !== undefined) updateData.slug = slug;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (imageAlt !== undefined) updateData.imageAlt = imageAlt;
    if (isRecommended !== undefined) updateData.isRecommended = isRecommended;
    if (order !== undefined) updateData.order = order;
    if (mediaId !== undefined) updateData.mediaId = mediaId;

    // Firestoreに保存
    await categoryRef.update(updateData);

    return NextResponse.json({
      message: 'Category updated successfully',
    });
  } catch (error: any) {
    console.error('[API] Category update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update category',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

