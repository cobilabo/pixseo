/**
 * OpenAI の返答を URL スラッグ向けに正規化する
 */
export function normalizeOpenAISlugOutput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * OpenAI が使えないときの記事・タイトル用フォールバック。
 * 英数字のみ残し、空なら `${prefix}-${Date.now()}`。
 */
export function generateSlugFallbackFromTitle(
  title: string,
  prefix = 'post'
): string {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);

  if (!slug) {
    slug = `${prefix}-${Date.now()}`;
  }

  return slug;
}

/**
 * OpenAI APIを使用して日本語から英語のスラッグを生成
 */
export async function generateEnglishSlug(
  name: string,
  type: 'tag' | 'category' = 'tag'
): Promise<string> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('[generateEnglishSlug] OpenAI API key is missing');
      return generateFallbackSlug(name);
    }

    const typeText = type === 'category' ? 'カテゴリー名' : 'タグ名';
    
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
            content: `日本語の${typeText}を、SEOに最適化された短く簡潔な英語のURLスラッグに変換してください。スラッグは小文字のみを使用し、単語間はハイフン(-)で区切ってください。最大3単語以内に収めてください。`,
          },
          {
            role: 'user',
            content: `以下の日本語${typeText}を英語のURLスラッグに変換してください。\n\n${typeText}: ${name}\n\nスラッグのみを出力してください（説明は不要）。`,
          },
        ],
        temperature: 0.2,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('[generateEnglishSlug] OpenAI API Error:', response.status);
      return generateFallbackSlug(name);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const slug = normalizeOpenAISlugOutput(raw);

    if (!slug) {
      return generateFallbackSlug(name);
    }

    return slug;
  } catch (error) {
    console.error('[generateEnglishSlug] Error:', error);
    return generateFallbackSlug(name);
  }
}

/** タグ・カテゴリ用フォールバック（プレフィックス item） */
function generateFallbackSlug(name: string): string {
  return generateSlugFallbackFromTitle(name, 'item');
}

