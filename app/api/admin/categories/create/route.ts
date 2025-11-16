import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

/**
 * カテゴリー作成API（翻訳処理付き）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description, imageUrl, imageAlt, isRecommended, order, mediaId } = body;

    if (!name || !slug || !mediaId) {
      return NextResponse.json(
        { error: 'Name, slug, and mediaId are required' },
        { status: 400 }
      );
    }

    // カテゴリーデータを準備
    const categoryData: any = {
      name,
      name_ja: name,
      slug,
      description: description || '',
      description_ja: description || '',
      imageUrl: imageUrl || '',
      imageAlt: imageAlt || '',
      isRecommended: isRecommended || false,
      order: order || 0,
      mediaId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 他言語へ翻訳
    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
    for (const lang of otherLangs) {
      try {
        // name翻訳
        categoryData[`name_${lang}`] = await translateText(name, lang, 'カテゴリー名');
        
        // description翻訳（存在する場合のみ）
        if (description) {
          categoryData[`description_${lang}`] = await translateText(description, lang, 'カテゴリー説明文');
        } else {
          categoryData[`description_${lang}`] = '';
        }
        
        console.log(`[Category Translation] ${lang} 翻訳成功`);
      } catch (error) {
        console.error(`[Category Translation Error] ${lang}:`, error);
        // エラー時は元のテキストを使用
        categoryData[`name_${lang}`] = name;
        categoryData[`description_${lang}`] = description || '';
      }
    }

    // Firestoreに保存
    const docRef = await adminDb.collection('categories').add(categoryData);

    return NextResponse.json({
      id: docRef.id,
      message: 'Category created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Category creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create category',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

