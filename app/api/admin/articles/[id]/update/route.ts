import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Article } from '@/types/article';
import { syncArticleToAlgolia, deleteArticleFromAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';
import { generateTableOfContents } from '@/lib/article-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分（翻訳処理のため）

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API] 記事更新開始:', params.id);
    const { id } = params;
    const body = await request.json();
    console.log('[API] 更新データ:', body);
    console.log('[API] isPublished:', body.isPublished);

    const articleRef = adminDb.collection('articles').doc(id);
    
    // 既存の記事データを取得（公開状態の変更を検出するため）
    const existingDoc = await articleRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;
    const wasPublished = existingData?.isPublished || false;
    const statusChanged = wasPublished !== body.isPublished;
    
    console.log('[API] 以前の公開状態:', wasPublished, '→ 新しい公開状態:', body.isPublished);
    console.log('[API] ステータス変更:', statusChanged);
    
    // publishedAtがnullの場合は下書き扱い
    const isDraft = body.publishedAt === null || body.isDraft === true;
    const publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    
    // updatedAtを現在時刻に設定
    let updateData: any = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
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
    console.log('[API] Firestore更新実行中（日本語版）...');
    await articleRef.update(updateData);
    console.log('[API] Firestore更新完了（日本語版）');

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
        console.log('[API] 想定読者を履歴に追加:', updateData.targetAudience);
      } catch (error) {
        console.error('[API] 想定読者履歴追加エラー:', error);
        // エラーが発生しても記事更新は成功とする
      }
    }

    // 🚀 公開時の翻訳処理（同期処理）
    // 条件：公開状態（常に翻訳を実行）
    if (body.isPublished === true) {
      console.log('[API] ===== 翻訳処理開始（同期） =====');
      console.log('[API] 記事ID:', id);
      console.log('[API] タイトル:', updateData.title || existingData?.title);
      
      try {
        const translationData: any = {};

        // 翻訳に使用するデータ（既存データと更新データをマージ）
        const contentToTranslate = updateData.content || existingData?.content || body.content;
        const titleToTranslate = updateData.title || existingData?.title || body.title;
        const excerptToTranslate = updateData.excerpt !== undefined ? updateData.excerpt : (existingData?.excerpt || body.excerpt || '');
        const metaTitleToTranslate = updateData.metaTitle || existingData?.metaTitle || titleToTranslate;
        const metaDescriptionToTranslate = updateData.metaDescription || existingData?.metaDescription || excerptToTranslate;
        const faqsToTranslate = updateData.faqs || existingData?.faqs_ja;

        console.log(`[API ${id}] 翻訳対象: title="${titleToTranslate}", content length=${contentToTranslate?.length || 0}`);

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

        // Algolia同期
        const updatedDoc = await articleRef.get();
        if (updatedDoc.exists) {
          const updatedData = updatedDoc.data()!;
          
          // Timestampまたは文字列をDateに変換するヘルパー
          const convertToDate = (value: any): Date => {
            if (!value) return new Date();
            if (value.toDate) return value.toDate(); // Firestore Timestamp
            if (value.seconds) return new Date(value.seconds * 1000); // Timestamp object
            if (typeof value === 'string') return new Date(value); // ISO string
            if (value instanceof Date) return value;
            return new Date();
          };
          
          const article: Article = {
            id: updatedDoc.id,
            ...updatedData,
            publishedAt: convertToDate(updatedData.publishedAt),
            updatedAt: convertToDate(updatedData.updatedAt),
          } as Article;

          await syncArticleToAlgolia(article);
          console.log(`[API ${id}] Algolia同期完了`);
        }
        
        console.log(`[API ${id}] ===== 翻訳処理完了 =====`);
      } catch (error) {
        console.error(`[API ${id}] 翻訳処理エラー:`, error);
        // エラーが発生しても記事の保存は完了しているので処理は続行
      }
    } else if (!body.isPublished) {
      // 非公開にした場合はAlgoliaから削除（同期処理）
      try {
        console.log('[API] Algoliaから削除開始 (非公開):', id);
        await deleteArticleFromAlgolia(id);
        console.log('[API] Algoliaから削除完了:', id);
      } catch (error) {
        console.error('[API] Algolia削除エラー:', error);
      }
    }

    // ⚡ レスポンスを返す
    return NextResponse.json({ success: true, message: body.isPublished ? '保存しました。翻訳とAlgolia登録が完了しました。' : '保存しました。' });
  } catch (error) {
    console.error('[API] 記事更新エラー:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

