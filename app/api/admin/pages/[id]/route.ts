import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Page } from '@/types/page';
import { translateArticle } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

// 固定ページ取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('pages').doc(params.id).get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }
    
    const data = doc.data();
    const page: Page = {
      id: doc.id,
      ...data,
      publishedAt: data?.publishedAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Page;
    
    return NextResponse.json(page);
  } catch (error) {
    console.error('[API] Error fetching page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// 固定ページ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // undefinedフィールドを除去（Firestoreはundefinedを許可しない）
    const cleanData = Object.fromEntries(
      Object.entries(body).filter(([_, value]) => value !== undefined)
    );
    
    const updateData: any = {
      ...cleanData,
      updatedAt: new Date(),
    };
    
    // title, content, excerpt等が更新される場合は翻訳
    if (body.title || body.content || body.excerpt || body.metaTitle || body.metaDescription) {
      // 日本語フィールドを保存
      if (body.title) {
        updateData.title_ja = body.title;
      }
      if (body.content) {
        updateData.content_ja = body.content;
      }
      if (body.excerpt) {
        updateData.excerpt_ja = body.excerpt;
      }
      if (body.metaTitle) {
        updateData.metaTitle_ja = body.metaTitle;
      }
      if (body.metaDescription) {
        updateData.metaDescription_ja = body.metaDescription;
      }
      
      // ブロックビルダー使用時は翻訳をスキップ（Phase 3で実装予定）
      if (body.useBlockBuilder) {
        const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
        for (const lang of otherLangs) {
          if (body.title) updateData[`title_${lang}`] = body.title;
          if (body.content) updateData[`content_${lang}`] = body.content;
          if (body.excerpt) updateData[`excerpt_${lang}`] = body.excerpt;
          if (body.metaTitle) updateData[`metaTitle_${lang}`] = body.metaTitle || body.title;
          if (body.metaDescription) updateData[`metaDescription_${lang}`] = body.metaDescription || body.excerpt;
        }
      } else {
        // 従来のエディター使用時は翻訳を実行
        const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
        for (const lang of otherLangs) {
          try {
            const translated = await translateArticle({
              title: body.title || '',
              content: body.content || '',
              excerpt: body.excerpt || '',
              metaTitle: body.metaTitle || body.title || '',
              metaDescription: body.metaDescription || body.excerpt || '',
            }, lang);
            
            if (body.title) updateData[`title_${lang}`] = translated.title;
            if (body.content) updateData[`content_${lang}`] = translated.content;
            if (body.excerpt) updateData[`excerpt_${lang}`] = translated.excerpt;
            if (body.metaTitle) updateData[`metaTitle_${lang}`] = translated.metaTitle;
            if (body.metaDescription) updateData[`metaDescription_${lang}`] = translated.metaDescription;
          } catch (error) {
            console.error(`[API] 翻訳エラー（${lang}）:`, error);
            // エラーの場合は日本語をコピー
            if (body.title) updateData[`title_${lang}`] = body.title;
            if (body.content) updateData[`content_${lang}`] = body.content;
            if (body.excerpt) updateData[`excerpt_${lang}`] = body.excerpt;
            if (body.metaTitle) updateData[`metaTitle_${lang}`] = body.metaTitle || body.title;
            if (body.metaDescription) updateData[`metaDescription_${lang}`] = body.metaDescription || body.excerpt;
          }
        }
      }
    }
    
    await adminDb.collection('pages').doc(params.id).update(updateData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// 固定ページ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await adminDb.collection('pages').doc(params.id).delete();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}

