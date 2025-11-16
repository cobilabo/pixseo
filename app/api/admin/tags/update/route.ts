import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

/**
 * タグ更新API（翻訳処理付き）
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, slug, mediaId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    // タグの存在確認
    const tagRef = adminDb.collection('tags').doc(id);
    const tagDoc = await tagRef.get();

    if (!tagDoc.exists) {
      return NextResponse.json(
        { error: 'Tag not found' },
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
          updateData[`name_${lang}`] = await translateText(name, lang, 'タグ名');
          console.log(`[Tag Name Translation] ${lang} 翻訳成功`);
        } catch (error) {
          console.error(`[Tag Name Translation Error] ${lang}:`, error);
          updateData[`name_${lang}`] = name;
        }
      }
    }

    if (slug !== undefined) updateData.slug = slug;
    if (mediaId !== undefined) updateData.mediaId = mediaId;

    // Firestoreに保存
    await tagRef.update(updateData);

    return NextResponse.json({
      message: 'Tag updated successfully',
    });
  } catch (error: any) {
    console.error('[API] Tag update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update tag',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

