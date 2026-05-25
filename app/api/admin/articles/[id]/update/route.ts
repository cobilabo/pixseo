import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Article } from '@/types/article';
import { syncArticleToAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';
import { generateTableOfContents } from '@/lib/article-utils';
import { cacheManager, revalidateArticle } from '@/lib/cache-manager';
import { buildArticleUpdatePayload } from '@/lib/article-update-payload';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分（翻訳処理のため）

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const articleRef = adminDb.collection('articles').doc(id);
    
    // 既存の記事データを取得（公開状態の変更を検出するため）
    const existingDoc = await articleRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;
    const wasPublished = existingData?.isPublished || false;
    const statusChanged = wasPublished !== body.isPublished;
    // publishedAtがnullの場合は下書き扱い
    const isDraft = body.publishedAt === null || body.isDraft === true;
    const publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    
    // クライアント由来の updatedAt 等を除外し、常にサーバー時刻で更新
    let updateData: any = {
      ...buildArticleUpdatePayload(body as Record<string, unknown>),
      // publishedAtを更新（nullの場合もnullとして保存）
      publishedAt: publishedAt,
      // 下書きの場合は非公開・非予約
      isPublished: isDraft ? false : (body.isPublished || false),
      isScheduled: isDraft ? false : (body.isScheduled || false),
    };

    // isDraftフィールドを削除（一時的なフラグ）
    delete updateData.isDraft;

    // 🌐 日本語フィールドを保存（常に実行）
    if (updateData.title) {
      updateData.title_ja = updateData.title;
    }
    if (updateData.content) {
      updateData.content_ja = updateData.content;
    }
    if (updateData.excerpt !== undefined) {
      updateData.excerpt_ja = updateData.excerpt || '';
    }
    if (updateData.metaTitle) {
      updateData.metaTitle_ja = updateData.metaTitle;
    }
    if (updateData.metaDescription) {
      updateData.metaDescription_ja = updateData.metaDescription;
    }

    // FAQsの日本語版を保存
    if (updateData.faqs && Array.isArray(updateData.faqs) && updateData.faqs.length > 0) {
      updateData.faqs_ja = updateData.faqs;
    }

    // 📝 日本語版を即座に保存
    await articleRef.update(updateData);

    // サーバーサイドメモリキャッシュと Vercel ISR キャッシュを即時無効化
    const articleSlug: string | undefined = updateData.slug || existingData?.slug;
    if (articleSlug) {
      cacheManager.deletePattern(`^article:${articleSlug}`);
    }
    cacheManager.deletePattern('^articles');
    cacheManager.deletePattern('^sliderArticles');
    cacheManager.deletePattern('^related');
    cacheManager.deletePattern('^recommendedArticles');
    cacheManager.deletePattern('^sitemap-article-slugs');
    cacheManager.deletePattern('^adjacent');
    revalidateArticle(articleSlug || null);
    // 🎯 想定読者を履歴に追加
    if (updateData.targetAudience && (existingData?.mediaId || updateData.mediaId)) {
      try {
        const mediaId = existingData?.mediaId || updateData.mediaId;
        const now = new Date();
        const historyRef = adminDb.collection('targetAudienceHistory').doc(mediaId);
        const historyDoc = await historyRef.get();
        
        if (!historyDoc.exists) {
          await historyRef.set({
            mediaId: mediaId,
            history: [updateData.targetAudience],
            createdAt: now,
            updatedAt: now,
          });
        } else {
          const historyData = historyDoc.data();
          const history = historyData?.history || [];
          
          if (!history.includes(updateData.targetAudience)) {
            const newHistory = [updateData.targetAudience, ...history].slice(0, 20);
            await historyRef.update({
              history: newHistory,
              updatedAt: now,
            });
          }
        }
      } catch (error) {
        console.error('[API] 想定読者履歴追加エラー:', error);
        // エラーが発生しても記事更新は成功とする
      }
    }

    // 🚀 翻訳・Algolia同期をバックグラウンドで実行（レスポンスをブロックしない）
    if (body.isPublished === true) {
      const bgArticleRef = adminDb.collection('articles').doc(id);
      const bgUpdateData = { ...updateData };
      const bgExistingData = existingData ? { ...existingData } : null;

      // ⚡ 先行 Algolia 同期: featuredImage / title / slug などの即時反映用。
      // 翻訳完了を待たずに日本語 + 既存多言語フィールドで一旦同期する。
      // これがないと、サムネイル変更などが検索結果ページに反映されるのが
      // 翻訳バックグラウンド完了 (数十秒〜数分) まで遅延する。
      // 翻訳完了後に再度 sync するため、最終的に多言語フィールドも上書きされる。
      (async () => {
        try {
          const convertToDate = (value: any): Date | undefined => {
            if (!value) return undefined;
            if (value.toDate) return value.toDate();
            if (value.seconds) return new Date(value.seconds * 1000);
            if (typeof value === 'string') return new Date(value);
            if (value instanceof Date) return value;
            return undefined;
          };
          const preDoc = await bgArticleRef.get();
          if (!preDoc.exists) return;
          const preData = preDoc.data()!;
          const preArticle: Article = {
            id: preDoc.id,
            ...preData,
            publishedAt: convertToDate(preData.publishedAt),
            updatedAt: convertToDate(preData.updatedAt) || new Date(),
          } as Article;
          await syncArticleToAlgolia(preArticle);
        } catch (error) {
          console.error(`[BG ${id}] 先行 Algolia 同期エラー:`, error);
        }
      })();

      // バックグラウンド処理（awaitしない）
      (async () => {
        try {
          const translationData: any = {};

          const contentToTranslate = bgUpdateData.content || bgExistingData?.content || body.content;
          const titleToTranslate = bgUpdateData.title || bgExistingData?.title || body.title;
          const excerptToTranslate = bgUpdateData.excerpt !== undefined ? bgUpdateData.excerpt : (bgExistingData?.excerpt || body.excerpt || '');
          const metaTitleToTranslate = bgUpdateData.metaTitle || bgExistingData?.metaTitle || titleToTranslate;
          const metaDescriptionToTranslate = bgUpdateData.metaDescription || bgExistingData?.metaDescription || excerptToTranslate;
          const faqsToTranslate = bgUpdateData.faqs || bgExistingData?.faqs_ja;

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

          const convertToDate = (value: any): Date => {
            if (!value) return new Date();
            if (value.toDate) return value.toDate();
            if (value.seconds) return new Date(value.seconds * 1000);
            if (typeof value === 'string') return new Date(value);
            if (value instanceof Date) return value;
            return new Date();
          };

          const updatedDoc = await bgArticleRef.get();
          if (updatedDoc.exists) {
            const updatedData = updatedDoc.data()!;
            const article: Article = {
              id: updatedDoc.id,
              ...updatedData,
              publishedAt: convertToDate(updatedData.publishedAt),
              updatedAt: convertToDate(updatedData.updatedAt),
            } as Article;
            await syncArticleToAlgolia(article);
          }
          console.log(`[BG ${id}] 翻訳・Algolia同期完了`);
        } catch (error) {
          console.error(`[BG ${id}] バックグラウンド翻訳処理エラー:`, error);
        }
      })();
    } else if (!body.isPublished) {
      // 未公開状態で保存された場合も Algolia に同期する（管理画面検索ヒット用）。
      // 翻訳は走らないため日本語フィールドのみのレコードになる（公開時に再 sync で上書き）。
      // 公開サイトは `isPublished:true` フィルタで自動的に非表示。
      const bgArticleRef = adminDb.collection('articles').doc(id);
      (async () => {
        try {
          const convertToDate = (value: any): Date | undefined => {
            if (!value) return undefined;
            if (value.toDate) return value.toDate();
            if (value.seconds) return new Date(value.seconds * 1000);
            if (typeof value === 'string') return new Date(value);
            if (value instanceof Date) return value;
            return undefined;
          };
          const updatedDoc = await bgArticleRef.get();
          if (!updatedDoc.exists) return;
          const updatedData = updatedDoc.data()!;
          const article: Article = {
            id: updatedDoc.id,
            ...updatedData,
            publishedAt: convertToDate(updatedData.publishedAt),
            updatedAt: convertToDate(updatedData.updatedAt) || new Date(),
          } as Article;
          await syncArticleToAlgolia(article);
        } catch (error) {
          console.error(`[BG ${id}] Algolia sync (unpublished) error:`, error);
        }
      })();
    }

    // ⚡ Firestore保存完了後に即座にレスポンスを返す（翻訳はバックグラウンドで継続）
    return NextResponse.json({ success: true, message: '保存しました。' });
  } catch (error) {
    console.error('[API] 記事更新エラー:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

