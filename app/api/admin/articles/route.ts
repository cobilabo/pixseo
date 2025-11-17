import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Article } from '@/types/article';
import { syncArticleToAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分（翻訳処理のため）

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
        // 管理画面用に faqs_ja を faqs にマッピング
        faqs: data.faqs_ja || [],
        createdAt: data.createdAt?.toDate(),
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
    console.log('[API] isPublished:', body.isPublished);

    // undefinedフィールドを除去（Firestoreはundefinedを許可しない）
    const cleanData = Object.fromEntries(
      Object.entries(body).filter(([_, value]) => value !== undefined)
    );

    const now = new Date();
    let articleData: any = {
      ...cleanData,
      createdAt: now,
      publishedAt: now,
      updatedAt: now,
      viewCount: 0,
      likeCount: 0,
    };

    // 🌐 日本語フィールドを保存（常に実行）
    articleData.title_ja = articleData.title;
    articleData.content_ja = articleData.content;
    articleData.excerpt_ja = articleData.excerpt || '';
    articleData.metaTitle_ja = articleData.metaTitle || articleData.title;
    articleData.metaDescription_ja = articleData.metaDescription || articleData.excerpt || '';

    // FAQsの日本語版を保存
    if (articleData.faqs && Array.isArray(articleData.faqs) && articleData.faqs.length > 0) {
      articleData.faqs_ja = articleData.faqs;
    }

    // 📝 日本語版を即座に保存
    const docRef = await adminDb.collection('articles').add(articleData);
    console.log('[API] Firestore作成完了（日本語版）:', docRef.id);

    // 🚀 公開時の翻訳処理（同期処理）
    if (articleData.isPublished === true) {
      console.log('[API] ===== 翻訳処理開始（同期） =====');
      console.log('[API] 記事ID:', docRef.id);
      console.log('[API] タイトル:', articleData.title);
      
      try {
        const translationData: any = {};
        const articleRef = adminDb.collection('articles').doc(docRef.id);

        console.log(`[API ${docRef.id}] 翻訳対象: title="${articleData.title}", content length=${articleData.content?.length || 0}`);

        // AIサマリー生成（日本語）
        try {
          const aiSummaryJa = await generateAISummary(articleData.content, 'ja');
          translationData.aiSummary_ja = aiSummaryJa;
          console.log(`[API ${docRef.id}] AIサマリー生成完了（ja）`);
        } catch (error) {
          console.error(`[API ${docRef.id}] AIサマリー生成エラー（ja）:`, error);
        }

        // 他の言語への翻訳（並列処理）
        const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
        console.log(`[API ${docRef.id}] 翻訳開始（並列）: ${otherLangs.join(', ')}`);
        
        await Promise.all(otherLangs.map(async (lang) => {
          try {
            console.log(`[API ${docRef.id}] 翻訳開始（${lang}）`);
            
            // 記事本体を翻訳
            const translated = await translateArticle({
              title: articleData.title,
              content: articleData.content,
              excerpt: articleData.excerpt || '',
              metaTitle: articleData.metaTitle || articleData.title,
              metaDescription: articleData.metaDescription || articleData.excerpt || '',
            }, lang);

            translationData[`title_${lang}`] = translated.title;
            translationData[`content_${lang}`] = translated.content;
            translationData[`excerpt_${lang}`] = translated.excerpt;
            translationData[`metaTitle_${lang}`] = translated.metaTitle;
            translationData[`metaDescription_${lang}`] = translated.metaDescription;

            // AIサマリーを生成
            const aiSummary = await generateAISummary(translated.content, lang);
            translationData[`aiSummary_${lang}`] = aiSummary;

            // FAQsを翻訳
            if (articleData.faqs && Array.isArray(articleData.faqs) && articleData.faqs.length > 0) {
              const translatedFaqs = await translateFAQs(articleData.faqs, lang);
              translationData[`faqs_${lang}`] = translatedFaqs;
            }

            console.log(`[API ${docRef.id}] 翻訳完了（${lang}）`);
          } catch (error) {
            console.error(`[API ${docRef.id}] 翻訳エラー（${lang}）:`, error);
          }
        }));
        
        console.log(`[API ${docRef.id}] 全言語の翻訳完了`);

        // 翻訳データを保存
        if (Object.keys(translationData).length > 0) {
          await articleRef.update(translationData);
          console.log(`[API ${docRef.id}] 翻訳データ保存完了`);
        }

        // Algolia同期
        const article: Article = {
          id: docRef.id,
          ...articleData,
          ...translationData,
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
        console.log(`[API ${docRef.id}] Algolia同期完了`);
        console.log(`[API ${docRef.id}] ===== 翻訳処理完了 =====`);
      } catch (error) {
        console.error(`[API ${docRef.id}] 翻訳処理エラー:`, error);
        // エラーが発生しても記事の作成は完了しているので処理は続行
      }
    }

    // ⚡ レスポンスを返す
    return NextResponse.json(
      { 
        id: docRef.id, 
        message: articleData.isPublished ? '保存しました。翻訳とAlgolia登録が完了しました。' : '保存しました。'
      }, 
      { status: 201 }
    );
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

