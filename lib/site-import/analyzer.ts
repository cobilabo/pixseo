import OpenAI from 'openai';
import { CrawlResult } from './crawler';

export interface AnalyzedCommonBlock {
  name: string;
  html: string;
  css: string;
  position: 'header' | 'footer' | 'navigation' | 'other';
}

export interface AnalyzedPage {
  url: string;
  title: string;
  slug: string;
  metaDescription: string;
  contentHtml: string;
  images: string[];
}

export interface AnalysisResult {
  commonBlocks: AnalyzedCommonBlock[];
  pages: AnalyzedPage[];
  sharedCss: string;
}

function truncateHtml(html: string, maxLength: number = 15000): string {
  if (html.length <= maxLength) return html;
  return html.substring(0, maxLength) + '\n<!-- ... truncated ... -->';
}

function buildPrompt(crawlResult: CrawlResult): string {
  const pagesSummary = crawlResult.pages.map((p, i) => {
    const bodyMatch = p.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : p.html;
    return `=== PAGE ${i + 1}: ${p.url} ===
TITLE: ${p.title}
BODY HTML:
${truncateHtml(bodyHtml)}
`;
  }).join('\n\n');

  return `あなたはHTML解析の専門家です。以下の複数ページのHTMLを分析し、共通要素とページ固有コンテンツを分離してください。

## 解析対象ページ一覧
${pagesSummary}

## タスク

1. **共通要素の検出**: 全ページ（または大半のページ）に共通するHTML部分を特定してください。
   - 共通ヘッダー（ロゴ、ナビゲーションメニュー等）
   - 共通フッター（フッターリンク、コピーライト等）
   - その他の共通要素があれば

2. **ページ固有コンテンツの抽出**: 各ページの固有コンテンツ（共通要素を除いた部分）を抽出してください。

3. **メタ情報の推定**: 各ページについて以下を推定してください：
   - title: ページタイトル
   - slug: URL用スラッグ（英数字とハイフン、先頭ページは "home"）
   - metaDescription: SEO用の説明文（120文字以内）

## 重要な注意事項
- 共通要素のHTMLは、元のHTML構造（クラス名、属性等）をそのまま維持してください
- 画像のsrc属性はそのまま維持してください（後工程で書き換えます）
- CSSクラス名は変更しないでください
- ページ固有コンテンツは<div>等で適切にラップしてください
- 先頭ページ（ルートURL）のslugは "home" にしてください

## 出力形式
以下のJSON形式で出力してください。JSONのみを出力し、マークダウンのコードブロック記号は不要です。

{
  "commonBlocks": [
    {
      "name": "共通ヘッダー",
      "html": "<header>...</header>",
      "css": "",
      "position": "header"
    },
    {
      "name": "共通フッター",
      "html": "<footer>...</footer>",
      "css": "",
      "position": "footer"
    }
  ],
  "pages": [
    {
      "url": "https://example.com/",
      "title": "ページタイトル",
      "slug": "home",
      "metaDescription": "ページの説明文",
      "contentHtml": "<div>ページ固有コンテンツ</div>",
      "images": ["https://example.com/image1.jpg"]
    }
  ],
  "sharedCss": ""
}`;
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRateLimitError(error: any): boolean {
  const message = error?.message || String(error);
  const status = error?.status || error?.statusCode;
  return status === 429 || message.includes('429') || message.includes('Too Many Requests') || message.includes('rate_limit');
}

function parseResponse(cleaned: string, crawlResult: CrawlResult): AnalysisResult {
  const parsed = JSON.parse(cleaned) as AnalysisResult;

  if (!parsed.commonBlocks || !Array.isArray(parsed.commonBlocks)) {
    parsed.commonBlocks = [];
  }
  if (!parsed.pages || !Array.isArray(parsed.pages)) {
    parsed.pages = [];
  }
  if (!parsed.sharedCss) {
    parsed.sharedCss = '';
  }

  for (const analyzedPage of parsed.pages) {
    const crawledPage = crawlResult.pages.find(p => p.url === analyzedPage.url);
    if (crawledPage && (!analyzedPage.images || analyzedPage.images.length === 0)) {
      analyzedPage.images = crawledPage.images;
    }
  }

  return parsed;
}

export async function analyzeWithGemini(
  crawlResult: CrawlResult,
  onProgress?: (message: string) => void,
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const modelName = process.env.OPENAI_SITE_IMPORT_MODEL || 'gpt-4o';

  const openai = new OpenAI({ apiKey });
  const prompt = buildPrompt(crawlResult);

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Analyzer] Retry attempt ${attempt}/${maxRetries}`);
        onProgress?.(`リトライ中...（${attempt}/${maxRetries}）`);
      } else {
        console.log(`[Analyzer] Using model: ${modelName}`);
        onProgress?.(`AI解析中...（モデル: ${modelName}）`);
      }

      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'あなたはHTML解析の専門家です。指示に従いJSON形式で回答してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error('OpenAI APIから空のレスポンスが返されました');
      }

      const cleaned = cleanJsonResponse(text);

      try {
        return parseResponse(cleaned, crawlResult);
      } catch (e) {
        console.error('[Analyzer] Failed to parse response:', cleaned.substring(0, 500));
        throw new Error('AI解析結果のパースに失敗しました。再度お試しください。');
      }
    } catch (error: any) {
      lastError = error;

      if (isRateLimitError(error) && attempt < maxRetries) {
        const waitMs = 10000 * (attempt + 1);
        console.log(`[Analyzer] Rate limited. Waiting ${waitMs}ms...`);
        onProgress?.(`レート制限中。${waitMs / 1000}秒後にリトライします...`);
        await sleep(waitMs);
        continue;
      }

      if (!isRateLimitError(error)) {
        throw error;
      }
    }
  }

  if (isRateLimitError(lastError)) {
    throw new Error(
      'OpenAI APIのレート制限に達しました。しばらく待ってから再度お試しください。'
    );
  }

  throw lastError;
}
