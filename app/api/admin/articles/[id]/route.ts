import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Article } from '@/types/article';
import { syncArticleToAlgolia, deleteArticleFromAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';
import { generateTableOfContents } from '@/lib/article-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分（翻訳処理のため）

/**
 * 記事削除API（AlgoliaとFirestoreから削除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[API DELETE /admin/articles/${id}] Deleting article...`);
    
    // Firestoreから削除
    const articleRef = adminDb.collection('articles').doc(id);
    const doc = await articleRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    await articleRef.delete();
    console.log(`[API DELETE /admin/articles/${id}] Deleted from Firestore`);
    
    // Algoliaから削除
    try {
      await deleteArticleFromAlgolia(id);
      console.log(`[API DELETE /admin/articles/${id}] Deleted from Algolia`);
    } catch (algoliaError) {
      console.error(`[API DELETE /admin/articles/${id}] Algolia delete error:`, algoliaError);
      // Algoliaの削除エラーは致命的ではないので処理は続行
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API DELETE /admin/articles] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete article', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Timestampまたは文字列をDateに変換するヘルパー
const convertToDate = (value: any): Date | undefined => {
  if (!value) return undefined; // 値がない場合はundefinedを返す
  if (value.toDate) return value.toDate(); // Firestore Timestamp
  if (value.seconds) return new Date(value.seconds * 1000); // Timestamp object
  if (typeof value === 'string') return new Date(value); // ISO string
  if (value instanceof Date) return value;
  return undefined;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[API /admin/articles/${id}] Fetching article...`);
    
    const articleRef = adminDb.collection('articles').doc(id);
    const doc = await articleRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const data = doc.data()!;
    const article: Article = {
      id: doc.id,
      ...data,
      // 管理画面用に faqs_ja を faqs にマッピング
      faqs: data.faqs_ja || [],
      createdAt: convertToDate(data.createdAt),
      // publishedAtがnull/undefinedの場合はそのまま返す（下書き対応）
      publishedAt: data.publishedAt ? convertToDate(data.publishedAt) : null,
      updatedAt: convertToDate(data.updatedAt) || new Date(),
    } as Article;

    console.log(`[API /admin/articles/${id}] Found article:`, article.title);
    console.log(`[API /admin/articles/${id}] featuredImage:`, data.featuredImage);
    console.log(`[API /admin/articles/${id}] featuredImageAlt:`, data.featuredImageAlt);
    console.log(`[API /admin/articles/${id}] article object featuredImageAlt:`, article.featuredImageAlt);
    console.log(`[API /admin/articles/${id}] FAQs count:`, article.faqs?.length || 0);
    return NextResponse.json(article);
  } catch (error) {
    console.error(`[API /admin/articles] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch article', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const body = await request.json();
    console.log(`[API /admin/articles/${id}] Updating article with:`, body);
    console.log(`[API /admin/articles/${id}] isPublished:`, body.isPublished);
    
    const articleRef = adminDb.collection('articles').doc(id);
    const doc = await articleRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // 既存データを取得（公開状態の変更を検出するため）
    const existingData = doc.data();
    const wasPublished = existingData?.isPublished || false;
    const isScheduled = existingData?.isScheduled || false;

    // 予約状態の記事は公開トグルで変更不可
    if (isScheduled && typeof body.isPublished === 'boolean') {
      return NextResponse.json(
        { error: '予約公開状態の記事は公開状態を変更できません。編集画面から公開日を変更してください。' },
        { status: 400 }
      );
    }

    // 更新データを作成
    const updateData: any = {
      updatedAt: new Date(),
    };

    // isPublishedが含まれている場合のみ更新
    if (typeof body.isPublished === 'boolean') {
      updateData.isPublished = body.isPublished;
    }

    // Firestoreを即座に更新
    await articleRef.update(updateData);
    console.log(`[API /admin/articles/${id}] Firestore updated`);

    // 公開ステータスが変更された場合
    const statusChanged = wasPublished !== body.isPublished;
    
    // 🚀 公開に切り替えた場合、翻訳とAlgolia登録を実行（同期的に実行）
    if (body.isPublished === true && statusChanged) {
      console.log(`[API] ===== 翻訳処理開始（同期） =====`);
      console.log(`[API] 記事ID: ${id}`);
      console.log(`[API] タイトル: ${existingData?.title}`);
      console.log(`[API] wasPublished: ${wasPublished}, isPublished: ${body.isPublished}, statusChanged: ${statusChanged}`);
      
      try {
        const translationData: any = {};

        // 既存データから翻訳用のデータを取得
        const contentToTranslate = existingData?.content || '';
        const titleToTranslate = existingData?.title || '';
        const excerptToTranslate = existingData?.excerpt || '';
        const metaTitleToTranslate = existingData?.metaTitle || titleToTranslate;
        const metaDescriptionToTranslate = existingData?.metaDescription || excerptToTranslate;
        const faqsToTranslate = existingData?.faqs_ja;

        console.log(`[API ${id}] 翻訳対象: title="${titleToTranslate}", content length=${contentToTranslate.length}`);

        // AIサマリー生成（日本語）
        if (contentToTranslate) {
          try {
            const aiSummaryJa = await generateAISummary(contentToTranslate, 'ja');
            translationData.aiSummary_ja = aiSummaryJa;
            console.log(`[API ${id}] AIサマリー生成完了（ja）`);
          } catch (error) {
            console.error(`[API ${id}] AIサマリー生成エラー（ja）:`, error);
          }
        }

        // 他の言語への翻訳（並列処理）
        const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
        console.log(`[API ${id}] 翻訳開始（並列）: ${otherLangs.join(', ')}`);
        
        await Promise.all(otherLangs.map(async (lang) => {
          try {
            console.log(`[API ${id}] 翻訳開始（${lang}）`);
            
            // 記事本体を翻訳
            const translated = await translateArticle({
              title: titleToTranslate,
              content: contentToTranslate,
              excerpt: excerptToTranslate,
              metaTitle: metaTitleToTranslate,
              metaDescription: metaDescriptionToTranslate,
            }, lang);

            translationData[`title_${lang}`] = translated.title;
            translationData[`content_${lang}`] = translated.content;
            translationData[`excerpt_${lang}`] = translated.excerpt;
            translationData[`metaTitle_${lang}`] = translated.metaTitle;
            translationData[`metaDescription_${lang}`] = translated.metaDescription;

            // 目次を生成
            const toc = generateTableOfContents(translated.content);
            translationData[`tableOfContents_${lang}`] = toc;

            // AIサマリーを生成
            const aiSummary = await generateAISummary(translated.content, lang);
            translationData[`aiSummary_${lang}`] = aiSummary;

            // FAQsを翻訳
            if (faqsToTranslate && Array.isArray(faqsToTranslate) && faqsToTranslate.length > 0) {
              const translatedFaqs = await translateFAQs(faqsToTranslate, lang);
              translationData[`faqs_${lang}`] = translatedFaqs;
            }

            console.log(`[API ${id}] 翻訳完了（${lang}）`);
          } catch (error) {
            console.error(`[API ${id}] 翻訳エラー（${lang}）:`, error);
          }
        }));
        
        console.log(`[API ${id}] 全言語の翻訳完了`);

        // 翻訳データを保存
        if (Object.keys(translationData).length > 0) {
          await articleRef.update(translationData);
          console.log(`[API ${id}] 翻訳データ保存完了`);
        }

        // Algolia同期（翻訳データを含む最新データを取得）
        const finalDoc = await articleRef.get();
        if (finalDoc.exists) {
          const finalData = finalDoc.data()!;
          const article: Article = {
            id: finalDoc.id,
            ...finalData,
            publishedAt: convertToDate(finalData.publishedAt) || new Date(),
            updatedAt: convertToDate(finalData.updatedAt) || new Date(),
          } as Article;

          await syncArticleToAlgolia(article);
          console.log(`[API ${id}] Algolia同期完了（全4言語）`);
        }
        
        console.log(`[API ${id}] ===== 翻訳処理完了 =====`);
      } catch (translationError) {
        console.error(`[API ${id}] 翻訳処理エラー:`, translationError);
        // エラーが発生しても記事の公開状態は更新済みなので処理は続行
      }
    } else if (!body.isPublished) {
      // 非公開にした場合は同期的にAlgoliaから削除
      try {
        await deleteArticleFromAlgolia(id);
        console.log(`[API /admin/articles/${id}] Removed from Algolia (unpublished)`);
      } catch (algoliaError) {
        console.error(`[API /admin/articles/${id}] Algolia delete error:`, algoliaError);
      }
    } else if (body.isPublished && !statusChanged) {
      // 既に公開済みの場合は、Algoliaに同期（翻訳なし）
      try {
        const updatedDoc = await articleRef.get();
        const updatedData = updatedDoc.data()!;
        
        const article: Article = {
          id: updatedDoc.id,
          ...updatedData,
          publishedAt: convertToDate(updatedData.publishedAt) || new Date(),
          updatedAt: convertToDate(updatedData.updatedAt) || new Date(),
        } as Article;

        await syncArticleToAlgolia(article);
        console.log(`[API /admin/articles/${id}] Synced to Algolia`);
      } catch (algoliaError) {
        console.error(`[API /admin/articles/${id}] Algolia sync error:`, algoliaError);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API /admin/articles/${id}] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to update article', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

