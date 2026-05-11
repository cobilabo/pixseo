import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Article } from '@/types/article';
import { syncArticleToAlgolia, deleteArticleFromAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';
import { generateTableOfContents } from '@/lib/article-utils';
import { cacheManager, revalidateArticle } from '@/lib/cache-manager';

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
    // Firestoreから削除
    const articleRef = adminDb.collection('articles').doc(id);
    const doc = await articleRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const deletedSlug = (doc.data()?.slug as string | undefined) || null;

    await articleRef.delete();
    // Algoliaから削除
    try {
      await deleteArticleFromAlgolia(id);
    } catch (algoliaError) {
      console.error(`[API DELETE /admin/articles/${id}] Algolia delete error:`, algoliaError);
      // Algoliaの削除エラーは致命的ではないので処理は続行
    }

    // Vercel ISR キャッシュを即時無効化
    revalidateArticle(deletedSlug);

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

    const updateData: any = {};

    // isPublishedが含まれている場合のみ更新
    if (typeof body.isPublished === 'boolean') {
      updateData.isPublished = body.isPublished;
    }

    // sliderOrder の更新（null でフィールド削除）
    if ('sliderOrder' in body) {
      if (body.sliderOrder === null || body.sliderOrder === undefined) {
        const { FieldValue } = await import('firebase-admin/firestore');
        updateData.sliderOrder = FieldValue.delete();
      } else {
        updateData.sliderOrder = body.sliderOrder;
      }
    }

    // タイトルの更新
    if (typeof body.title === 'string') {
      updateData.title = body.title;
    }

    // カテゴリーIDの更新
    if (Array.isArray(body.categoryIds)) {
      updateData.categoryIds = body.categoryIds;
    }

    // タグIDの更新
    if (Array.isArray(body.tagIds)) {
      updateData.tagIds = body.tagIds;
    }

    // Firestoreを即座に更新
    await articleRef.update(updateData);

    // 記事関連のサーバーサイドメモリキャッシュをクリア
    const articleSlug = existingData?.slug;
    if (articleSlug) {
      cacheManager.deletePattern(`^article:${articleSlug}`);
    }
    cacheManager.deletePattern('^articles');
    cacheManager.deletePattern('^sliderArticles');
    cacheManager.deletePattern('^sitemap-article-slugs');
    cacheManager.deletePattern('^adjacent');

    // Vercel ISR キャッシュを即時無効化（公開状態が変わった場合のみでも良いが、
    // カテゴリー / タグ / タイトル変更でも一覧に影響があるため常に実行）
    revalidateArticle(articleSlug || null);

    // 公開ステータスが変更された場合
    const isPublishedInBody = typeof body.isPublished === 'boolean';
    const statusChanged = isPublishedInBody && wasPublished !== body.isPublished;
    
    // 🚀 公開に切り替えた場合、翻訳とAlgolia登録をバックグラウンドで実行
    if (body.isPublished === true && statusChanged) {
      const bgArticleRef = adminDb.collection('articles').doc(id);
      const bgExistingData = existingData ? { ...existingData } : null;

      (async () => {
        try {
          const translationData: any = {};

          const contentToTranslate = bgExistingData?.content || '';
          const titleToTranslate = bgExistingData?.title || '';
          const excerptToTranslate = bgExistingData?.excerpt || '';
          const metaTitleToTranslate = bgExistingData?.metaTitle || titleToTranslate;
          const metaDescriptionToTranslate = bgExistingData?.metaDescription || excerptToTranslate;
          const faqsToTranslate = bgExistingData?.faqs_ja;

          if (contentToTranslate) {
            try {
              const aiSummaryJa = await generateAISummary(contentToTranslate, 'ja');
              translationData.aiSummary_ja = aiSummaryJa;
            } catch (error) {
              console.error(`[BG ${id}] AIサマリー生成エラー（ja）:`, error);
            }
          }

          const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
          
          await Promise.all(otherLangs.map(async (lang) => {
            try {
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

              const toc = generateTableOfContents(translated.content);
              translationData[`tableOfContents_${lang}`] = toc;

              const aiSummary = await generateAISummary(translated.content, lang);
              translationData[`aiSummary_${lang}`] = aiSummary;

              if (faqsToTranslate && Array.isArray(faqsToTranslate) && faqsToTranslate.length > 0) {
                const translatedFaqs = await translateFAQs(faqsToTranslate, lang);
                translationData[`faqs_${lang}`] = translatedFaqs;
              }
            } catch (error) {
              console.error(`[BG ${id}] 翻訳エラー（${lang}）:`, error);
            }
          }));

          if (Object.keys(translationData).length > 0) {
            await bgArticleRef.update(translationData);
          }

          const finalDoc = await bgArticleRef.get();
          if (finalDoc.exists) {
            const finalData = finalDoc.data()!;
            const article: Article = {
              id: finalDoc.id,
              ...finalData,
              publishedAt: convertToDate(finalData.publishedAt) || new Date(),
              updatedAt: convertToDate(finalData.updatedAt) || new Date(),
            } as Article;
            await syncArticleToAlgolia(article);
          }
          console.log(`[BG ${id}] 翻訳・Algolia同期完了`);
        } catch (error) {
          console.error(`[BG ${id}] バックグラウンド翻訳処理エラー:`, error);
        }
      })();
    } else {
      // 公開→非公開、または公開中のメタ更新（タイトル・カテゴリー・タグ等）。
      // 未公開記事も Algolia に残す方針 (管理画面検索ヒット用) のため、
      // どちらのケースでも delete ではなく sync で再投入する。
      // isPublished フィールドが Algolia 側でも更新されるので、公開サイトは
      // `isPublished:true` フィルタで自動的に非表示となる。
      (async () => {
        try {
          const bgRef = adminDb.collection('articles').doc(id);
          const updatedDoc = await bgRef.get();
          if (!updatedDoc.exists) return;
          const updatedData = updatedDoc.data()!;
          const article: Article = {
            id: updatedDoc.id,
            ...updatedData,
            publishedAt: convertToDate(updatedData.publishedAt) || undefined,
            updatedAt: convertToDate(updatedData.updatedAt) || new Date(),
          } as Article;
          await syncArticleToAlgolia(article);
        } catch (algoliaError) {
          console.error(`[BG /admin/articles/${id}] Algolia sync error:`, algoliaError);
        }
      })();
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

