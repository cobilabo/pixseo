import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Article } from '@/types/article';
import { syncArticleToAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    
    console.log('[API /admin/articles] Fetching articles...', { mediaId });
    
    let articlesRef = adminDb.collection('articles');
    
    // mediaIdが指定されている場合はフィルタリング
    let query: FirebaseFirestore.Query = articlesRef;
    if (mediaId) {
      query = articlesRef.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await query.get();

    console.log(`[API /admin/articles] Found ${snapshot.size} articles`);

    const articles: Article[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Article;
    });

    // クライアント側でソートするため、そのまま返す
    return NextResponse.json(articles);
  } catch (error) {
    console.error('[API /admin/articles] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] 記事作成開始');
    const body = await request.json();
    console.log('[API] 作成データ:', body);

    // undefinedフィールドを除去（Firestoreはundefinedを許可しない）
    const cleanData = Object.fromEntries(
      Object.entries(body).filter(([_, value]) => value !== undefined)
    );

    const now = new Date();
    let articleData: any = {
      ...cleanData,
      publishedAt: now,
      updatedAt: now,
      viewCount: 0,
      likeCount: 0,
    };

    // 🌐 多言語翻訳処理
    // 日本語フィールドを保存
    articleData.title_ja = articleData.title;
    articleData.content_ja = articleData.content;
    articleData.excerpt_ja = articleData.excerpt || '';
    articleData.metaTitle_ja = articleData.metaTitle || articleData.title;
    articleData.metaDescription_ja = articleData.metaDescription || articleData.excerpt || '';
    
    // 日本語でAIサマリーを生成
    try {
      const aiSummaryJa = await generateAISummary(articleData.content, 'ja');
      articleData.aiSummary_ja = aiSummaryJa;
      console.log('[API] AIサマリー生成完了（ja）');
    } catch (error) {
      console.error('[API] AIサマリー生成エラー（ja）:', error);
      // エラーでも続行
    }

    // FAQsの日本語版を保存
    if (articleData.faqs && Array.isArray(articleData.faqs) && articleData.faqs.length > 0) {
      articleData.faqs_ja = articleData.faqs;
    }

    // 他の言語への翻訳
    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
    for (const lang of otherLangs) {
      try {
        console.log(`[API] 翻訳開始（${lang}）`);
        
        // 記事本体を翻訳
        const translated = await translateArticle({
          title: articleData.title,
          content: articleData.content,
          excerpt: articleData.excerpt || '',
          metaTitle: articleData.metaTitle || articleData.title,
          metaDescription: articleData.metaDescription || articleData.excerpt || '',
        }, lang);

        articleData[`title_${lang}`] = translated.title;
        articleData[`content_${lang}`] = translated.content;
        articleData[`excerpt_${lang}`] = translated.excerpt;
        articleData[`metaTitle_${lang}`] = translated.metaTitle;
        articleData[`metaDescription_${lang}`] = translated.metaDescription;

        // AIサマリーを生成
        const aiSummary = await generateAISummary(translated.content, lang);
        articleData[`aiSummary_${lang}`] = aiSummary;

        // FAQsを翻訳
        if (articleData.faqs && Array.isArray(articleData.faqs) && articleData.faqs.length > 0) {
          const translatedFaqs = await translateFAQs(articleData.faqs, lang);
          articleData[`faqs_${lang}`] = translatedFaqs;
        }

        console.log(`[API] 翻訳完了（${lang}）`);
      } catch (error) {
        console.error(`[API] 翻訳エラー（${lang}）:`, error);
        // エラーでも他の言語の翻訳は続行
      }
    }

    const docRef = await adminDb.collection('articles').add(articleData);
    console.log('[API] Firestore作成完了:', docRef.id);

    // 公開済みの場合、Algoliaに同期
    if (articleData.isPublished === true) {
      try {
        console.log('[API] Algolia同期開始:', docRef.id);
        
        const article: Article = {
          id: docRef.id,
          ...articleData,
          publishedAt: now,
          updatedAt: now,
        } as Article;

        // カテゴリー名を取得
        const categoryNames: string[] = [];
        if (article.categoryIds && Array.isArray(article.categoryIds)) {
          for (const catId of article.categoryIds) {
            const catDoc = await adminDb.collection('categories').doc(catId).get();
            if (catDoc.exists) {
              categoryNames.push(catDoc.data()?.name || '');
            }
          }
        }

        // タグ名を取得
        const tagNames: string[] = [];
        if (article.tagIds && Array.isArray(article.tagIds)) {
          for (const tagId of article.tagIds) {
            const tagDoc = await adminDb.collection('tags').doc(tagId).get();
            if (tagDoc.exists) {
              tagNames.push(tagDoc.data()?.name || '');
            }
          }
        }

        await syncArticleToAlgolia(article, categoryNames, tagNames);
        console.log('[API] Algolia同期完了:', docRef.id);
      } catch (algoliaError) {
        console.error('[API] Algolia同期エラー:', algoliaError);
        // Algolia同期のエラーは致命的ではないので、処理は続行
      }
    }

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('[API] 記事作成エラー:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create article',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

