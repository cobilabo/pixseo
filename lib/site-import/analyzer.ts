import OpenAI from 'openai';

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

export interface AICommonBlock {
  name: string;
  selector: string;
  position: 'header' | 'footer' | 'navigation' | 'other';
}

export interface AIPageMeta {
  url: string;
  title: string;
  slug: string;
  metaDescription: string;
}

interface AIResponse {
  commonBlocks: AICommonBlock[];
  pages: AIPageMeta[];
}

export interface SelectorAnalysisInput {
  samplePages: { url: string; bodyHtml: string }[];
  allPages: { url: string; title: string }[];
}

export interface SelectorAnalysisResult {
  commonBlocks: AICommonBlock[];
  pages: AIPageMeta[];
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max) + '\n<!-- truncated -->';
}

export function inferSlugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '').replace(/^\//, '');
    if (!path) return 'home';
    const last = path.split('/').pop() || 'home';
    return last.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  } catch {
    return 'page';
  }
}

function buildSelectorPrompt(input: SelectorAnalysisInput): string {
  const perPage = Math.floor(60000 / Math.max(input.samplePages.length, 1));

  const pagesHtml = input.samplePages.map((p, i) => {
    const body = truncate(p.bodyHtml, perPage);
    return `=== PAGE ${i + 1}: ${p.url} ===\n${body}`;
  }).join('\n\n');

  const allPages = input.allPages.map((p, i) =>
    `${i + 1}. ${p.url} (title: ${p.title})`
  ).join('\n');

  return `HTMLを分析し、共通要素のCSSセレクタとページのメタ情報を返してください。

## 代表ページのHTML（${input.samplePages.length}ページ）
${pagesHtml}

## 全ページ一覧（${input.allPages.length}ページ）
${allPages}

## タスク
1. **共通要素を可能な限りすべて検出**してください。特に以下の要素は必ず確認してください：
   - **ヘッダー**: サイトロゴ、グローバルナビゲーション等（<header>タグやクラス名で判定）
   - **フッター**: フッターリンク、コピーライト、会社情報等（<footer>タグやクラス名で判定）
   - **ナビゲーション**: ヘッダーと別のナビゲーションがあれば
   - その他全ページに共通する要素
   
   セレクタは具体的に指定してください（例: "header.site-header", "footer#footer", "footer", "nav.global-nav"）
   タグ名だけでもOKです（例: "header", "footer"）。クラスやIDがあればそれも含めてください。
   **ヘッダーとフッターは必ず両方検出してください。**

2. 全ページのメタ情報を推定してください。

## 出力JSON形式

{
  "commonBlocks": [
    { "name": "共通ヘッダー", "selector": "header", "position": "header" },
    { "name": "共通フッター", "selector": "footer", "position": "footer" }
  ],
  "pages": [
    { "url": "https://example.com/", "title": "ホーム", "slug": "home", "metaDescription": "説明文" }
  ]
}`
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRateLimitError(error: any): boolean {
  const msg = error?.message || String(error);
  const status = error?.status || error?.statusCode;
  return status === 429 || msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('rate_limit');
}

export async function analyzeSelectors(
  input: SelectorAnalysisInput,
  onProgress?: (message: string) => void,
): Promise<SelectorAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const modelName = process.env.OPENAI_SITE_IMPORT_MODEL || 'gpt-4o';
  const openai = new OpenAI({ apiKey });

  onProgress?.(`AI解析中...（共通要素の検出 - ${modelName}）`);

  const prompt = buildSelectorPrompt(input);
  console.log(`[Analyzer] Prompt: ${prompt.length} chars, ~${Math.ceil(prompt.length / 3)} tokens (est.)`);

  let aiResult: AIResponse | undefined;
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Analyzer] Retry ${attempt}/${maxRetries}`);
        onProgress?.(`リトライ中...（${attempt}/${maxRetries}）`);
      }

      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'あなたはHTML解析の専門家です。指示に従い正確なJSON形式で回答してください。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('OpenAI APIから空のレスポンスが返されました');

      aiResult = JSON.parse(cleanJsonResponse(text)) as AIResponse;
      break;
    } catch (error: any) {
      lastError = error;
      if (isRateLimitError(error) && attempt < maxRetries) {
        const waitMs = 10000 * (attempt + 1);
        onProgress?.(`レート制限中。${waitMs / 1000}秒後にリトライ...`);
        await sleep(waitMs);
        continue;
      }
      if (!isRateLimitError(error)) throw error;
    }
  }

  if (!aiResult) {
    if (isRateLimitError(lastError)) {
      throw new Error('OpenAI APIのレート制限に達しました。しばらく待ってから再度お試しください。');
    }
    throw lastError;
  }

  console.log(`[Analyzer] AI returned ${aiResult.commonBlocks?.length || 0} common blocks, ${aiResult.pages?.length || 0} pages`);

  return {
    commonBlocks: aiResult.commonBlocks || [],
    pages: aiResult.pages || [],
  };
}
