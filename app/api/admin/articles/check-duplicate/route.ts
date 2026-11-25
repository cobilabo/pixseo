import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * 記事の重複チェック
 * タイトルと本文の類似度をチェック
 */
export async function POST(request: NextRequest) {
  const adminCtx = await requireAdmin(request);
  if (adminCtx instanceof NextResponse) return adminCtx;

  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { articleId, title, content } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    if (!title && !content) {
      return NextResponse.json(
        { error: 'Title or content is required' },
        { status: 400 }
      );
    }

    // 既存記事を取得
    const existingArticlesSnapshot = await adminDb
      .collection('articles')
      .where('mediaId', '==', mediaId)
      .where('isPublished', '==', true)
      .get();

    const existingArticles = existingArticlesSnapshot.docs
      .filter(doc => doc.id !== articleId) // 現在編集中の記事は除外
      .map(doc => ({
        id: doc.id,
        title: doc.data().title,
        content: doc.data().content,
      }));

    const duplicates: Array<{
      articleId: string;
      title: string;
      titleSimilarity: number;
      contentSimilarity: number;
    }> = [];

    for (const existingArticle of existingArticles) {
      let titleSimilarity = 0;
      let contentSimilarity = 0;

      // タイトルの類似度チェック
      if (title && existingArticle.title) {
        titleSimilarity = calculateTextSimilarity(title, existingArticle.title);
      }

      // 本文の類似度チェック（最初の500文字で比較）
      if (content && existingArticle.content) {
        const contentPreview = content.substring(0, 500);
        const existingContentPreview = existingArticle.content.substring(0, 500);
        contentSimilarity = calculateTextSimilarity(contentPreview, existingContentPreview);
      }

      // 類似度が70%以上の場合、重複として報告
      if (titleSimilarity > 0.7 || contentSimilarity > 0.7) {
        duplicates.push({
          articleId: existingArticle.id,
          title: existingArticle.title,
          titleSimilarity,
          contentSimilarity,
        });
      }
    }

    return NextResponse.json({
      isDuplicate: duplicates.length > 0,
      duplicates,
      checkedCount: existingArticles.length,
    });
  } catch (error) {
    console.error('[API /admin/articles/check-duplicate] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check duplicates', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * テキストの類似度を計算（簡易版）
 * 0.0（完全に異なる）から1.0（完全に同じ）の範囲
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  // 正規化（小文字化、空白の統一）
  const normalized1 = text1.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalized2 = text2.toLowerCase().trim().replace(/\s+/g, ' ');

  if (normalized1 === normalized2) return 1.0;

  // 単語ベースの類似度計算
  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  // Jaccard類似度
  const jaccardSimilarity = intersection.size / union.size;

  // 文字列の類似度（Levenshtein距離ベースの簡易版）
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const editDistance = levenshteinDistance(normalized1, normalized2);
  const stringSimilarity = 1 - (editDistance / maxLength);

  // 2つの類似度の平均を返す
  return (jaccardSimilarity + stringSimilarity) / 2;
}

/**
 * Levenshtein距離を計算
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

