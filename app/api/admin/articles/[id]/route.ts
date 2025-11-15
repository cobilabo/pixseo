import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Article } from '@/types/article';
import { syncArticleToAlgolia, deleteArticleFromAlgolia } from '@/lib/algolia/sync';

export const dynamic = 'force-dynamic';

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
      publishedAt: data.publishedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Article;

    console.log(`[API /admin/articles/${id}] Found article:`, article.title);
    console.log(`[API /admin/articles/${id}] featuredImage:`, data.featuredImage);
    console.log(`[API /admin/articles/${id}] featuredImageAlt:`, data.featuredImageAlt);
    console.log(`[API /admin/articles/${id}] article object featuredImageAlt:`, article.featuredImageAlt);
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
    
    const articleRef = adminDb.collection('articles').doc(id);
    const doc = await articleRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
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

    await articleRef.update(updateData);

    console.log(`[API /admin/articles/${id}] Article updated successfully`);
    
    // 更新後の記事データを取得してAlgoliaに同期
    try {
      const updatedDoc = await articleRef.get();
      const updatedData = updatedDoc.data()!;
      
      const article: Article = {
        id: updatedDoc.id,
        ...updatedData,
        publishedAt: updatedData.publishedAt?.toDate() || new Date(),
        updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      } as Article;

      // 公開済みの記事のみAlgoliaに同期
      if (article.isPublished) {
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
      } else {
        // 非公開にした場合はAlgoliaから削除
        await deleteArticleFromAlgolia(id);
        console.log(`[API /admin/articles/${id}] Removed from Algolia (unpublished)`);
      }
    } catch (algoliaError) {
      console.error(`[API /admin/articles/${id}] Algolia sync error:`, algoliaError);
      // Algolia同期のエラーは致命的ではないので、処理は続行
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

