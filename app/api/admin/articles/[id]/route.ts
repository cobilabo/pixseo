import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Article } from '@/types/article';
import { syncArticleToAlgolia, deleteArticleFromAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

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
      publishedAt: data.publishedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
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
    
    // 🚀 非公開→公開に切り替わった場合、バックグラウンドで翻訳
    if (body.isPublished && statusChanged && !wasPublished) {
      console.log(`[API /admin/articles/${id}] バックグラウンド処理開始（翻訳 + Algolia）`);
      
      // バックグラウンド処理（レスポンスを待たない）
      Promise.resolve().then(async () => {
        try {
          const translationData: any = {};

          // 既存データから翻訳用のデータを取得
          const contentToTranslate = existingData?.content || '';
          const titleToTranslate = existingData?.title || '';
          const excerptToTranslate = existingData?.excerpt || '';
          const metaTitleToTranslate = existingData?.metaTitle || titleToTranslate;
          const metaDescriptionToTranslate = existingData?.metaDescription || excerptToTranslate;
          const faqsToTranslate = existingData?.faqs_ja;

          // AIサマリー生成（日本語）
          if (contentToTranslate) {
            try {
              const aiSummaryJa = await generateAISummary(contentToTranslate, 'ja');
              translationData.aiSummary_ja = aiSummaryJa;
              console.log(`[Background ${id}] AIサマリー生成完了（ja）`);
            } catch (error) {
              console.error(`[Background ${id}] AIサマリー生成エラー（ja）:`, error);
            }
          }

          // 他の言語への翻訳
          const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
          for (const lang of otherLangs) {
            try {
              console.log(`[Background ${id}] 翻訳開始（${lang}）`);
              
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

              // AIサマリーを生成
              const aiSummary = await generateAISummary(translated.content, lang);
              translationData[`aiSummary_${lang}`] = aiSummary;

              // FAQsを翻訳
              if (faqsToTranslate && Array.isArray(faqsToTranslate) && faqsToTranslate.length > 0) {
                const translatedFaqs = await translateFAQs(faqsToTranslate, lang);
                translationData[`faqs_${lang}`] = translatedFaqs;
              }

              console.log(`[Background ${id}] 翻訳完了（${lang}）`);
            } catch (error) {
              console.error(`[Background ${id}] 翻訳エラー（${lang}）:`, error);
            }
          }

          // 翻訳データを保存
          if (Object.keys(translationData).length > 0) {
            await articleRef.update(translationData);
            console.log(`[Background ${id}] 翻訳データ保存完了`);
          }

          // Algolia同期（翻訳データを含む最新データを取得）
          const finalDoc = await articleRef.get();
          if (finalDoc.exists) {
            const finalData = finalDoc.data()!;
            const article: Article = {
              id: finalDoc.id,
              ...finalData,
              publishedAt: finalData.publishedAt?.toDate() || new Date(),
              updatedAt: finalData.updatedAt?.toDate() || new Date(),
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
            console.log(`[Background ${id}] Algolia同期完了（全4言語）`);
          }
        } catch (bgError) {
          console.error(`[Background ${id}] バックグラウンド処理エラー:`, bgError);
        }
      });
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
          publishedAt: updatedData.publishedAt?.toDate() || new Date(),
          updatedAt: updatedData.updatedAt?.toDate() || new Date(),
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

