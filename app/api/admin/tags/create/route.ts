import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

/**
 * タグ作成API（翻訳処理付き）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, mediaId } = body;

    if (!name || !slug || !mediaId) {
      return NextResponse.json(
        { error: 'Name, slug, and mediaId are required' },
        { status: 400 }
      );
    }

    // タグデータを準備
    const tagData: any = {
      name,
      name_ja: name,
      slug,
      mediaId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 他言語へ翻訳
    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
    for (const lang of otherLangs) {
      try {
        tagData[`name_${lang}`] = await translateText(name, lang, 'タグ名');
      } catch (error) {
        console.error(`[Tag Translation Error] ${lang}:`, error);
        // エラー時は元のテキストを使用
        tagData[`name_${lang}`] = name;
      }
    }

    // Firestoreに保存
    const docRef = await adminDb.collection('tags').add(tagData);

    return NextResponse.json({
      id: docRef.id,
      message: 'Tag created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Tag creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create tag',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

