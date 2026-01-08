import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Page } from '@/types/page';
import { translateArticle } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

// 固定ページ一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    let query: FirebaseFirestore.Query = adminDb.collection('pages');
    
    // mediaIdが指定されている場合はフィルタリング
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await query.get();
    const pages: Page[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Page;
    });
    
    // クライアント側でソート
    return NextResponse.json(pages);
  } catch (error) {
    console.error('[API] Error fetching pages:', error);
    console.error('[API] Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: 'Failed to fetch pages',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 固定ページ作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // undefinedフィールドを除去（Firestoreはundefinedを許可しない）
    const cleanData = Object.fromEntries(
      Object.entries(body).filter(([_, value]) => value !== undefined)
    );
    
    const pageData: any = {
      ...cleanData,
      publishedAt: new Date(),
      updatedAt: new Date(),
    };
    
    // 日本語フィールドを保存
    pageData.title_ja = pageData.title;
    pageData.content_ja = pageData.content;
    pageData.excerpt_ja = pageData.excerpt || '';
    pageData.metaTitle_ja = pageData.metaTitle || pageData.title;
    pageData.metaDescription_ja = pageData.metaDescription || pageData.excerpt || '';
    
    // ブロックビルダー使用時は翻訳をスキップ（Phase 3で実装予定）
    if (pageData.useBlockBuilder) {
      const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
      for (const lang of otherLangs) {
        pageData[`title_${lang}`] = pageData.title;
        pageData[`content_${lang}`] = pageData.content;
        pageData[`excerpt_${lang}`] = pageData.excerpt || '';
        pageData[`metaTitle_${lang}`] = pageData.metaTitle || pageData.title;
        pageData[`metaDescription_${lang}`] = pageData.metaDescription || pageData.excerpt || '';
      }
    } else {
      // 従来のエディター使用時は翻訳を実行
      const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
      for (const lang of otherLangs) {
        try {
          const translated = await translateArticle({
            title: pageData.title,
            content: pageData.content,
            excerpt: pageData.excerpt || '',
            metaTitle: pageData.metaTitle || pageData.title,
            metaDescription: pageData.metaDescription || pageData.excerpt || '',
          }, lang);
          
          pageData[`title_${lang}`] = translated.title;
          pageData[`content_${lang}`] = translated.content;
          pageData[`excerpt_${lang}`] = translated.excerpt;
          pageData[`metaTitle_${lang}`] = translated.metaTitle;
          pageData[`metaDescription_${lang}`] = translated.metaDescription;
        } catch (error) {
          console.error(`[API] 翻訳エラー（${lang}）:`, error);
          // エラーの場合は日本語をコピー
          pageData[`title_${lang}`] = pageData.title;
          pageData[`content_${lang}`] = pageData.content;
          pageData[`excerpt_${lang}`] = pageData.excerpt || '';
          pageData[`metaTitle_${lang}`] = pageData.metaTitle || pageData.title;
          pageData[`metaDescription_${lang}`] = pageData.metaDescription || pageData.excerpt || '';
        }
      }
    }
    
    const docRef = await adminDb.collection('pages').add(pageData);
    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating page:', error);
    console.error('[API] Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: 'Failed to create page',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

