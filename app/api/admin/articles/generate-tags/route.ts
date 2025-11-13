import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * OpenAI APIを使用して記事からタグを自動生成
 * 既存タグとの類似度チェックを行い、統合または新規作成
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { title, content } = body;

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

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // 既存タグを取得
    const existingTagsSnapshot = await adminDb
      .collection('tags')
      .where('mediaId', '==', mediaId)
      .get();

    const existingTags = existingTagsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      slug: doc.data().slug,
    }));

    const existingTagNames = existingTags.map(tag => tag.name).join(', ');

    // 本文からテキストのみを抽出（HTMLタグを除去）
    const plainContent = content.replace(/<[^>]*>/g, ' ').substring(0, 1000);

    // OpenAI APIを呼び出してタグ候補を生成
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `あなたはSEOに強いタグ生成の専門家です。記事の内容を分析し、SEOに効果的な広義で汎用的なタグを5個生成してください。

重要なルール:
- 広く使われる一般的なキーワードを使用（細かすぎる分類は避ける）
- 例：良い「AI」「マーケティング」、悪い「AI駆動UX」「AIツール統合」
- 類似する概念は1つのタグに統合（例：「持続可能性」「持続可能なデザイン」→「サステナビリティ」）
- SEOで検索されやすい汎用的なキーワードを優先
- 1-2単語程度の短いタグ
- 既存タグと類似する場合は既存タグ名を必ず使用

既存タグ: ${existingTagNames || 'なし'}`,
          },
          {
            role: 'user',
            content: `以下の記事から、検索されやすい広義で汎用的なタグを5個生成してください。細かすぎる分類は避け、広く使われる一般的なキーワードを使用してください。既存タグと類似する場合は既存タグ名を使用してください。\n\nタイトル: ${title}\n\n本文:\n${plainContent}\n\nタグをカンマ区切りで出力してください（説明は不要）。`,
          },
        ],
        temperature: 0.2,
        max_tokens: 100,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('[OpenAI API Error]', errorData);
      return NextResponse.json(
        { error: 'Failed to generate tags with OpenAI API', details: errorData },
        { status: openaiResponse.status }
      );
    }

    const openaiData = await openaiResponse.json();
    const generatedTagsText = openaiData.choices?.[0]?.message?.content?.trim() || '';

    if (!generatedTagsText) {
      return NextResponse.json(
        { error: 'No tags generated' },
        { status: 500 }
      );
    }

    // タグをパース
    const suggestedTagNames = generatedTagsText
      .split(/[,、]/)
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0)
      .slice(0, 5); // 最大5個に制限

    console.log('[API /admin/articles/generate-tags] 生成されたタグ候補:', suggestedTagNames);

    // 各タグについて、既存タグとの類似度をチェックして統合または作成
    const finalTags: Array<{ id: string; name: string; slug: string; isExisting: boolean }> = [];

    for (const suggestedName of suggestedTagNames) {
      // 既存タグとの類似度をチェック
      const similarTag = findMostSimilarTag(suggestedName, existingTags);

      if (similarTag && similarTag.similarity > 0.7) {
        // 類似度70%以上の既存タグがある場合は既存タグを使用
        console.log(`[類似タグ統合] "${suggestedName}" → "${similarTag.tag.name}"`);
        finalTags.push({
          id: similarTag.tag.id,
          name: similarTag.tag.name,
          slug: similarTag.tag.slug,
          isExisting: true,
        }        );
      } else {
        // 新規タグとして作成（スラッグを英語で生成）
        const slug = await generateEnglishSlug(suggestedName, openaiApiKey);
        
        // 同じスラッグのタグが既に存在しないかチェック
        const existingTagWithSlug = existingTags.find(t => t.slug === slug);
        if (existingTagWithSlug) {
          console.log(`[既存タグ使用] "${suggestedName}" → "${existingTagWithSlug.name}"`);
          finalTags.push({
            id: existingTagWithSlug.id,
            name: existingTagWithSlug.name,
            slug: existingTagWithSlug.slug,
            isExisting: true,
          });
        } else {
          // スラッグ重複チェック
          let finalSlug = slug;
          let counter = 2;
          while (existingTags.some(t => t.slug === finalSlug) || finalTags.some(t => t.slug === finalSlug)) {
            finalSlug = `${slug}-${counter}`;
            counter++;
          }

          // 新規タグを作成
          console.log(`[新規タグ作成] "${suggestedName}" (slug: ${finalSlug})`);
          const newTagRef = await adminDb.collection('tags').add({
            mediaId,
            name: suggestedName,
            slug: finalSlug,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          finalTags.push({
            id: newTagRef.id,
            name: suggestedName,
            slug: finalSlug,
            isExisting: false,
          });
        }
      }
    }

    // 重複を除去（IDベース）
    const uniqueTags = Array.from(
      new Map(finalTags.map(tag => [tag.id, tag])).values()
    );

    console.log('[API /admin/articles/generate-tags] 最終タグ:', uniqueTags);

    return NextResponse.json({
      tags: uniqueTags,
      summary: {
        total: uniqueTags.length,
        existing: uniqueTags.filter(t => t.isExisting).length,
        new: uniqueTags.filter(t => !t.isExisting).length,
      },
    });
  } catch (error) {
    console.error('[API /admin/articles/generate-tags] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate tags', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * 最も類似した既存タグを見つける
 */
function findMostSimilarTag(
  suggestedName: string,
  existingTags: Array<{ id: string; name: string; slug: string }>
): { tag: { id: string; name: string; slug: string }; similarity: number } | null {
  let maxSimilarity = 0;
  let mostSimilarTag = null;

  for (const existingTag of existingTags) {
    const similarity = calculateSimilarity(suggestedName, existingTag.name);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarTag = existingTag;
    }
  }

  return mostSimilarTag
    ? { tag: mostSimilarTag, similarity: maxSimilarity }
    : null;
}

/**
 * 2つの文字列の類似度を計算（簡易版）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  // 一方が他方を含む場合
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return shorter / longer;
  }

  // Levenshtein距離ベースの類似度
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
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

/**
 * OpenAI APIを使用してタグ名から英語のスラッグを生成
 */
async function generateEnglishSlug(tagName: string, openaiApiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '日本語のタグ名を、SEOに最適化された短く簡潔な英語のURLスラッグに変換してください。スラッグは小文字のみを使用し、単語間はハイフン(-)で区切ってください。最大3単語以内に収めてください。',
          },
          {
            role: 'user',
            content: `以下の日本語タグ名を英語のURLスラッグに変換してください。\n\nタグ名: ${tagName}\n\nスラッグのみを出力してください（説明は不要）。`,
          },
        ],
        temperature: 0.2,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('[OpenAI Slug Generation Error]');
      return generateFallbackSlug(tagName);
    }

    const data = await response.json();
    let slug = data.choices?.[0]?.message?.content?.trim() || '';

    if (!slug) {
      return generateFallbackSlug(tagName);
    }

    // スラッグをクリーンアップ
    slug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug;
  } catch (error) {
    console.error('[Error generating English slug]', error);
    return generateFallbackSlug(tagName);
  }
}

/**
 * フォールバック用の簡易スラッグ生成
 */
function generateFallbackSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
}

