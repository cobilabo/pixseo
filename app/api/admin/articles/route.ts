import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Article } from '@/types/article';
import { syncArticleToAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';
import { generateTableOfContents } from '@/lib/article-utils';
import { cacheManager, revalidateArticle } from '@/lib/cache-manager';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分（翻訳処理のため）

export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    let articlesRef = adminDb.collection('articles');
    
    // mediaIdが指定されている場合はフィルタリング
    let query: FirebaseFirestore.Query = articlesRef;
    if (mediaId) {
      query = articlesRef.where('mediaId', '==', mediaId);
    }
    
    const snapshot = await query.get();
    // Timestampまたは文字列をDateに変換するヘルパー
    const convertToDate = (value: any): Date | undefined => {
      if (!value) return undefined; // 値がない場合はundefinedを返す
      if (value.toDate) return value.toDate(); // Firestore Timestamp
      if (value.seconds) return new Date(value.seconds * 1000); // Timestamp object
      if (typeof value === 'string') return new Date(value); // ISO string
      if (value instanceof Date) return value;
      return undefined;
    };

    const articles: Article[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const publishedAt = data.publishedAt ? convertToDate(data.publishedAt) : undefined;
      const updatedAt = convertToDate(data.updatedAt) || new Date();
      return {
        id: doc.id,
        ...data,
        // 管理画面用に faqs_ja を faqs にマッピング
        faqs: data.faqs_ja || [],
        // createdAtがない場合はpublishedAt、それもない場合はupdatedAtをフォールバック
        createdAt: convertToDate(data.createdAt) || publishedAt || updatedAt,
        // publishedAtがnull/undefinedの場合はそのまま返す（下書き対応）
        publishedAt: publishedAt,
        updatedAt: updatedAt,
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
    const body = await request.json();
    // undefinedフィールドを除去（Firestoreはundefinedを許可しない）
    const cleanData = Object.fromEntries(
      Object.entries(body).filter(([_, value]) => value !== undefined)
    );

    const now = new Date();
    // publishedAtがnullまたは未設定の場合は下書き扱い
    const isDraft = cleanData.publishedAt === null || cleanData.isDraft === true;
    const publishedAt = cleanData.publishedAt ? new Date(cleanData.publishedAt as string | number | Date) : null;
    
    let articleData: any = {
      ...cleanData,
      createdAt: now,
      publishedAt: publishedAt, // nullの場合はnullとして保存
      updatedAt: now,
      viewCount: 0,
      likeCount: 0,
      isDraft: isDraft,
      // 下書きの場合は非公開・非予約
      isPublished: isDraft ? false : (cleanData.isPublished || false),
      isScheduled: isDraft ? false : (cleanData.isScheduled || false),
    };
    
    // isDraftフィールドを削除（一時的なフラグ）
    delete articleData.isDraft;

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
    // 🎯 想定読者を履歴に追加
    if (articleData.targetAudience && articleData.mediaId) {
      try {
        const historyRef = adminDb.collection('targetAudienceHistory').doc(articleData.mediaId);
        const historyDoc = await historyRef.get();
        
        if (!historyDoc.exists) {
          await historyRef.set({
            mediaId: articleData.mediaId,
            history: [articleData.targetAudience],
            createdAt: now,
            updatedAt: now,
          });
        } else {
          const historyData = historyDoc.data();
          const history = historyData?.history || [];
          
          if (!history.includes(articleData.targetAudience)) {
            const newHistory = [articleData.targetAudience, ...history].slice(0, 20);
            await historyRef.update({
              history: newHistory,
              updatedAt: now,
            });
          }
        }
      } catch (error) {
        console.error('[API] 想定読者履歴追加エラー:', error);
        // エラーが発生しても記事作成は成功とする
      }
    }

    // サーバーサイドメモリキャッシュと Vercel ISR キャッシュを即時無効化
    // (Algolia / 翻訳の前に実行することで、Firestore 直読みのページは即時反映される)
    cacheManager.deletePattern('^articles');
    cacheManager.deletePattern('^sliderArticles');
    cacheManager.deletePattern('^recommendedArticles');
    cacheManager.deletePattern('^sitemap-article-slugs');
    revalidateArticle((articleData.slug as string) || null);

    if (articleData.isPublished === true) {
      // ⚡ 先行 Algolia 同期: featuredImage / title / slug などを即時に検索結果へ反映する。
      // 翻訳完了を待たずに日本語フィールドだけで一旦同期する。
      // (これがないと、検索結果ページの画像・タイトル等が翻訳バックグラウンド完了まで古いまま)
      const preArticle: Article = {
        id: docRef.id,
        ...articleData,
        publishedAt: publishedAt ?? now,
        updatedAt: now,
      } as Article;
      (async () => {
        try {
          await syncArticleToAlgolia(preArticle);
        } catch (error) {
          console.error(`[BG ${docRef.id}] 先行 Algolia 同期エラー:`, error);
        }
      })();

      // 🚀 翻訳・最終 Algolia 同期をバックグラウンドで実行（レスポンスをブロックしない）
      const bgArticleData = { ...articleData };
      (async () => {
        try {
          const translationData: any = {};
          const articleRef = adminDb.collection('articles').doc(docRef.id);
          try {
            const aiSummaryJa = await generateAISummary(bgArticleData.content, 'ja');
            translationData.aiSummary_ja = aiSummaryJa;
          } catch (error) {
            console.error(`[BG ${docRef.id}] AIサマリー生成エラー（ja）:`, error);
          }

          const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');

          await Promise.all(otherLangs.map(async (lang) => {
            try {
              const translated = await translateArticle({
                title: bgArticleData.title,
                content: bgArticleData.content,
                excerpt: bgArticleData.excerpt || '',
                metaTitle: bgArticleData.metaTitle || bgArticleData.title,
                metaDescription: bgArticleData.metaDescription || bgArticleData.excerpt || '',
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

              if (bgArticleData.faqs && Array.isArray(bgArticleData.faqs) && bgArticleData.faqs.length > 0) {
                const translatedFaqs = await translateFAQs(bgArticleData.faqs, lang);
                translationData[`faqs_${lang}`] = translatedFaqs;
              }
            } catch (error) {
              console.error(`[BG ${docRef.id}] 翻訳エラー（${lang}）:`, error);
            }
          }));
          if (Object.keys(translationData).length > 0) {
            await articleRef.update(translationData);
          }

          const finalArticle: Article = {
            id: docRef.id,
            ...bgArticleData,
            ...translationData,
            publishedAt: publishedAt ?? now,
            updatedAt: now,
          } as Article;

          await syncArticleToAlgolia(finalArticle);
          console.log(`[BG ${docRef.id}] 翻訳・Algolia同期完了`);
        } catch (error) {
          console.error(`[BG ${docRef.id}] バックグラウンド翻訳処理エラー:`, error);
        }
      })();
    } else {
      // 未公開時も Algolia に同期する（管理画面検索ヒット用、isPublished:false で登録）。
      // 翻訳は走らないため日本語フィールドのみのレコードになる。公開時に再 sync で上書きされる。
      try {
        const article: Article = {
          id: docRef.id,
          ...articleData,
          publishedAt: publishedAt ?? undefined,
          updatedAt: now,
        } as Article;
        await syncArticleToAlgolia(article);
      } catch (error) {
        console.error(`[API ${docRef.id}] Algolia sync (unpublished) error:`, error);
      }
    }

    // ⚡ レスポンスを返す（公開時は翻訳をバックグラウンドで継続）
    return NextResponse.json(
      {
        id: docRef.id,
        message: articleData.isPublished
          ? '保存しました。翻訳・Algolia多言語反映はバックグラウンドで継続します。'
          : '保存しました。',
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

