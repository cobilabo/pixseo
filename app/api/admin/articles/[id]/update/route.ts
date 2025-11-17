import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Article } from '@/types/article';
import { syncArticleToAlgolia, deleteArticleFromAlgolia } from '@/lib/algolia/sync';
import { translateArticle, translateFAQs, generateAISummary } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API] 記事更新開始:', params.id);
    const { id } = params;
    const body = await request.json();
    console.log('[API] 更新データ:', body);
    console.log('[API] isPublished:', body.isPublished);

    const articleRef = adminDb.collection('articles').doc(id);
    
    // updatedAtを現在時刻に設定
    let updateData: any = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };

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

    // 🚀 公開時のみバックグラウンドで翻訳 + Algolia同期
    if (body.isPublished && (updateData.title || updateData.content)) {
      console.log('[API] バックグラウンド処理開始（翻訳 + Algolia）');
      
      // バックグラウンド処理（レスポンスを待たない）
      Promise.resolve().then(async () => {
        try {
          const translationData: any = {};

          // AIサマリー生成（日本語）
          if (updateData.content) {
            try {
              const aiSummaryJa = await generateAISummary(updateData.content, 'ja');
              translationData.aiSummary_ja = aiSummaryJa;
              console.log('[Background] AIサマリー生成完了（ja）');
            } catch (error) {
              console.error('[Background] AIサマリー生成エラー（ja）:', error);
            }
          }

          // 他の言語への翻訳
          const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
          for (const lang of otherLangs) {
            try {
              console.log(`[Background] 翻訳開始（${lang}）`);
              
              // 記事本体を翻訳
              const translated = await translateArticle({
                title: updateData.title || body.title,
                content: updateData.content || body.content,
                excerpt: updateData.excerpt || body.excerpt || '',
                metaTitle: updateData.metaTitle || body.metaTitle || updateData.title || body.title,
                metaDescription: updateData.metaDescription || body.metaDescription || updateData.excerpt || body.excerpt || '',
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
              if (updateData.faqs && Array.isArray(updateData.faqs) && updateData.faqs.length > 0) {
                const translatedFaqs = await translateFAQs(updateData.faqs, lang);
                translationData[`faqs_${lang}`] = translatedFaqs;
              }

              console.log(`[Background] 翻訳完了（${lang}）`);
            } catch (error) {
              console.error(`[Background] 翻訳エラー（${lang}）:`, error);
            }
          }

          // 翻訳データを保存
          if (Object.keys(translationData).length > 0) {
            await articleRef.update(translationData);
            console.log('[Background] 翻訳データ保存完了');
          }

          // Algolia同期
          const updatedDoc = await articleRef.get();
          if (updatedDoc.exists) {
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
            console.log('[Background] Algolia同期完了');
          }
        } catch (error) {
          console.error('[Background] バックグラウンド処理エラー:', error);
        }
      }).catch(error => {
        console.error('[Background] Promise catch:', error);
      });
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

    // ⚡ 即座にレスポンスを返す
    return NextResponse.json({ success: true, message: body.isPublished ? '保存しました。翻訳とAlgolia登録をバックグラウンドで実行中です。' : '保存しました。' });
  } catch (error) {
    console.error('[API] 記事更新エラー:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

