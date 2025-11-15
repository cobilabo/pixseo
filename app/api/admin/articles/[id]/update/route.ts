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
    console.log('[API] featuredImageAlt:', body.featuredImageAlt);

    const articleRef = adminDb.collection('articles').doc(id);
    
    // updatedAtを現在時刻に設定
    let updateData: any = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 🌐 多言語翻訳処理
    // 日本語フィールドを保存
    if (updateData.title) {
      updateData.title_ja = updateData.title;
    }
    if (updateData.content) {
      updateData.content_ja = updateData.content;
      
      // 日本語でAIサマリーを生成
      try {
        const aiSummaryJa = await generateAISummary(updateData.content, 'ja');
        updateData.aiSummary_ja = aiSummaryJa;
        console.log('[API] AIサマリー生成完了（ja）');
      } catch (error) {
        console.error('[API] AIサマリー生成エラー（ja）:', error);
      }
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

    // タイトルまたはコンテンツが更新された場合のみ翻訳を実行
    if (updateData.title || updateData.content) {
      // 他の言語への翻訳
      const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
      for (const lang of otherLangs) {
        try {
          console.log(`[API] 翻訳開始（${lang}）`);
          
          // 記事本体を翻訳
          const translated = await translateArticle({
            title: updateData.title || body.title,
            content: updateData.content || body.content,
            excerpt: updateData.excerpt || body.excerpt || '',
            metaTitle: updateData.metaTitle || body.metaTitle || updateData.title || body.title,
            metaDescription: updateData.metaDescription || body.metaDescription || updateData.excerpt || body.excerpt || '',
          }, lang);

          updateData[`title_${lang}`] = translated.title;
          updateData[`content_${lang}`] = translated.content;
          updateData[`excerpt_${lang}`] = translated.excerpt;
          updateData[`metaTitle_${lang}`] = translated.metaTitle;
          updateData[`metaDescription_${lang}`] = translated.metaDescription;

          // AIサマリーを生成
          const aiSummary = await generateAISummary(translated.content, lang);
          updateData[`aiSummary_${lang}`] = aiSummary;

          // FAQsを翻訳
          if (updateData.faqs && Array.isArray(updateData.faqs) && updateData.faqs.length > 0) {
            const translatedFaqs = await translateFAQs(updateData.faqs, lang);
            updateData[`faqs_${lang}`] = translatedFaqs;
          }

          console.log(`[API] 翻訳完了（${lang}）`);
        } catch (error) {
          console.error(`[API] 翻訳エラー（${lang}）:`, error);
          // エラーでも他の言語の翻訳は続行
        }
      }
    }

    console.log('[API] Firestore更新実行中...');
    console.log('[API] updateDataに含まれるfeaturedImageAlt:', updateData.featuredImageAlt);
    await articleRef.update(updateData);
    console.log('[API] Firestore更新完了');

    // 更新後の記事データを取得してAlgoliaに同期
    try {
      const updatedDoc = await articleRef.get();
      if (!updatedDoc.exists) {
        throw new Error('Updated article not found');
      }
      
      const updatedData = updatedDoc.data()!;
      
      const article: Article = {
        id: updatedDoc.id,
        ...updatedData,
        publishedAt: updatedData.publishedAt?.toDate() || new Date(),
        updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      } as Article;

      // 公開済みの記事のみAlgoliaに同期
      if (article.isPublished) {
        console.log('[API] Algolia同期開始:', id);
        
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
        console.log('[API] Algolia同期完了:', id);
      } else {
        // 非公開にした場合はAlgoliaから削除
        console.log('[API] Algoliaから削除開始 (非公開):', id);
        await deleteArticleFromAlgolia(id);
        console.log('[API] Algoliaから削除完了:', id);
      }
    } catch (algoliaError) {
      console.error('[API] Algolia同期エラー:', algoliaError);
      // Algolia同期のエラーは致命的ではないので、処理は続行
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 記事更新エラー:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

