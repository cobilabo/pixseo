import OpenAI from 'openai';
import { Lang } from '@/types/lang';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/** Strip NUL and lone UTF-16 surrogates so request JSON serializes reliably. */
export function sanitizeOpenAIUserContent(text: string): string {
  if (!text) return '';
  let s = text.replace(/\u0000/g, '');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += s[i] + s[i + 1];
        i++;
      } else {
        out += '\ufffd';
      }
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      out += '\ufffd';
    } else {
      out += s[i];
    }
  }
  return out;
}

const HTML_TRANSLATE_CHUNK = 42000;

function chunkHtmlForTranslation(html: string, softMax: number): string[] {
  if (html.length <= softMax) return [html];
  const chunks: string[] = [];
  let start = 0;
  while (start < html.length) {
    if (html.length - start <= softMax) {
      chunks.push(html.slice(start));
      break;
    }
    const endLimit = start + softMax;
    const slice = html.slice(start, endLimit);
    const breakers = ['</p>', '</div>', '</section>', '</article>', '</li>', '\n\n'];
    let bestEnd = -1;
    for (const b of breakers) {
      const idx = slice.lastIndexOf(b);
      if (idx !== -1) {
        const pos = start + idx + b.length;
        if (pos - start >= softMax * 0.25) bestEnd = Math.max(bestEnd, pos);
      }
    }
    const cut = bestEnd === -1 ? endLimit : bestEnd;
    chunks.push(html.slice(start, cut));
    start = cut;
  }
  return chunks;
}

async function translateArticleHtmlInChunks(
  html: string,
  targetLang: Lang
): Promise<string> {
  const sanitized = sanitizeOpenAIUserContent(html);
  const chunks = chunkHtmlForTranslation(sanitized, HTML_TRANSLATE_CHUNK);
  if (chunks.length === 1) {
    return translateText(chunks[0], targetLang, '記事本文（HTML形式）');
  }
  const parts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const ctx = `記事本文（HTML形式）。全${chunks.length}分割の第${i + 1}部。タグ構造を保ち、前後断片と連続するよう欠けた開始・終了タグを出さないこと。`;
    parts.push(await translateText(chunks[i], targetLang, ctx));
  }
  return parts.join('\n');
}

/**
 * テキストを指定言語に翻訳
 */
export async function translateText(
  text: string,
  targetLang: Lang,
  context?: string
): Promise<string> {
  if (!text || text.trim() === '') {
    return '';
  }

  text = sanitizeOpenAIUserContent(text);

  // 日本語の場合はそのまま返す
  if (targetLang === 'ja') {
    return text;
  }

  const langNames: Record<Lang, string> = {
    ja: '日本語',
    en: '英語（アメリカ英語）',
    zh: '中国語（簡体字）',
    ko: '韓国語',
  };

  const systemPrompt = `あなたは高品質な翻訳者です。
${context ? `このテキストは${context}です。` : ''}
以下の要件に従って、日本語から${langNames[targetLang]}へ正確に翻訳してください：

1. **自然で読みやすい翻訳**：ネイティブスピーカーが読んでも違和感のない自然な表現にする
2. **文脈の維持**：元のニュアンスや意図を正確に伝える
3. **専門用語**：IT、ビジネス、マーケティング用語は適切に翻訳する
4. **HTMLタグの保持**：HTMLタグが含まれる場合は、タグをそのまま保持し、テキスト部分のみを翻訳する
5. **改行の保持**：元のテキストの改行構造を保持する
6. **SEO最適化**：検索エンジンに適した自然な表現にする
7. **翻訳のみを返す**：余計な説明や注釈は不要。翻訳結果のみを返してください`;

  try {
    const estimatedTokens = Math.ceil(text.length / 2);
    const maxTokens = Math.min(Math.max(4000, estimatedTokens), 8192);

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    });

    const translatedText = response.choices[0]?.message?.content?.trim() || '';
    return translatedText;
  } catch (error) {
    console.error(`[OpenAI Translation Error] Failed to translate to ${targetLang}:`, error);
    throw new Error(`翻訳に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}

/**
 * 複数のテキストをバッチ翻訳
 */
export async function translateBatch(
  texts: Record<string, string>,
  targetLang: Lang,
  context?: string
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  
  // 並列実行（最大5件ずつ）
  const entries = Object.entries(texts);
  const chunkSize = 5;
  
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const promises = chunk.map(async ([key, text]) => {
      try {
        const translated = await translateText(text, targetLang, context);
        return { key, translated };
      } catch (error) {
        console.error(`[Batch Translation] Failed for key "${key}":`, error);
        // エラーの場合は元のテキストを返す
        return { key, translated: text };
      }
    });
    
    const chunkResults = await Promise.all(promises);
    chunkResults.forEach(({ key, translated }) => {
      results[key] = translated;
    });
  }
  
  return results;
}

/**
 * 記事全体を翻訳
 */
export async function translateArticle(
  article: {
    title: string;
    content: string;
    excerpt: string;
    metaTitle?: string;
    metaDescription?: string;
  },
  targetLang: Lang
): Promise<{
  title: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
}> {
  const [title, content, excerpt, metaTitle, metaDescription] = await Promise.all([
    translateText(article.title, targetLang, '記事タイトル'),
    translateArticleHtmlInChunks(article.content, targetLang),
    translateText(article.excerpt, targetLang, '記事の要約'),
    translateText(article.metaTitle || article.title, targetLang, 'SEOメタタイトル'),
    translateText(article.metaDescription || article.excerpt, targetLang, 'SEOメタディスクリプション'),
  ]);

  return {
    title,
    content,
    excerpt,
    metaTitle,
    metaDescription,
  };
}

/**
 * FAQを翻訳
 */
export async function translateFAQs(
  faqs: Array<{ question: string; answer: string }>,
  targetLang: Lang
): Promise<Array<{ question: string; answer: string }>> {
  const translatedFAQs = await Promise.all(
    faqs.map(async (faq) => {
      const [question, answer] = await Promise.all([
        translateText(faq.question, targetLang, 'FAQ質問'),
        translateText(faq.answer, targetLang, 'FAQ回答'),
      ]);
      return { question, answer };
    })
  );

  return translatedFAQs;
}

/**
 * AIサマリーを生成（多言語対応）
 */
export async function generateAISummary(
  content: string,
  lang: Lang
): Promise<string> {
  const langNames: Record<Lang, string> = {
    ja: '日本語',
    en: '英語',
    zh: '中国語',
    ko: '韓国語',
  };

  const systemPrompt = `あなたはSEOとAIO（AI Optimization）の専門家です。
以下の記事内容を分析し、${langNames[lang]}で150-200文字程度の簡潔で分かりやすい要約を作成してください。

要件：
1. AIエンジン（ChatGPT、Gemini等）が理解しやすい構造的な要約
2. 記事の主要なポイントを3つ程度含める
3. SEO的に重要なキーワードを自然に含める
4. 読者が記事の価値を即座に理解できる内容
5. 専門用語は適度に使用し、分かりやすく説明する`;

  const body = sanitizeOpenAIUserContent(content).slice(0, 24000);

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `記事内容:\n${body}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('[OpenAI] Failed to generate AI summary:', error);
    throw new Error('AIサマリー生成に失敗しました');
  }
}

