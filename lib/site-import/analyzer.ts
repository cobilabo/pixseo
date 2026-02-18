import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { CrawlResult, CrawledPage } from './crawler';

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

interface AICommonBlock {
  name: string;
  selector: string;
  position: 'header' | 'footer' | 'navigation' | 'other';
}

interface AIPageMeta {
  url: string;
  title: string;
  slug: string;
  metaDescription: string;
}

interface AIResponse {
  commonBlocks: AICommonBlock[];
  pages: AIPageMeta[];
}

function stripForAI(html: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, '<svg/>');
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\sdata-[a-z-]+="[^"]*"/gi, '');
  s = s.replace(/\s(aria-[a-z-]+|role|tabindex|draggable)="[^"]*"/gi, '');
  s = s.replace(/\sstyle="[^"]*"/gi, '');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n\s*\n/g, '\n');
  return s.trim();
}

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max) + '\n<!-- truncated -->';
}

function inferSlugFromUrl(url: string): string {
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

function buildPhase1Prompt(crawlResult: CrawlResult): string {
  const samples = crawlResult.pages.slice(0, 3);
  const perPage = Math.floor(60000 / samples.length);

  const pagesHtml = samples.map((p, i) => {
    const body = truncate(stripForAI(extractBody(p.html)), perPage);
    return `=== PAGE ${i + 1}: ${p.url} ===\n${body}`;
  }).join('\n\n');

  const allPages = crawlResult.pages.map((p, i) =>
    `${i + 1}. ${p.url} (title: ${p.title})`
  ).join('\n');

  return `HTMLを分析し、共通要素のCSSセレクタとページのメタ情報を返してください。

## 代表ページのHTML（${samples.length}ページ）
${pagesHtml}

## 全ページ一覧（${crawlResult.pages.length}ページ）
${allPages}

## タスク
1. 共通要素（ヘッダー、フッター、ナビゲーション等）を検出し、それぞれのCSSセレクタを返してください。
   - セレクタは具体的に（例: "header.site-header", "footer#footer", "nav.global-nav"）
   - タグ名だけでなくクラスやIDを含めてください

2. 全ページのメタ情報を推定してください。

## 出力JSON形式

{
  "commonBlocks": [
    { "name": "共通ヘッダー", "selector": "header.site-header", "position": "header" },
    { "name": "共通フッター", "selector": "footer.site-footer", "position": "footer" }
  ],
  "pages": [
    { "url": "https://example.com/", "title": "ホーム", "slug": "home", "metaDescription": "説明文" }
  ]
}`;
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

function extractCommonBlockHtml(page: CrawledPage, selector: string): string {
  try {
    const $ = cheerio.load(page.html);
    const el = $(selector).first();
    if (el.length === 0) return '';
    return $.html(el) || '';
  } catch {
    return '';
  }
}

function extractPageContent(page: CrawledPage, selectors: string[]): string {
  try {
    const $ = cheerio.load(page.html);
    $('script').remove();
    $('link[rel="stylesheet"]').remove();
    $('meta').remove();
    $('title').remove();

    for (const sel of selectors) {
      try { $(sel).remove(); } catch { /* skip invalid selector */ }
    }

    const body = $('body');
    if (body.length === 0) return $.html() || '';

    let html = body.html() || '';
    html = html.replace(/^\s+|\s+$/g, '');
    return html;
  } catch {
    return extractBody(page.html);
  }
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

  // Phase 1: AI detects common block selectors + page metadata
  onProgress?.(`AI解析中...（共通要素の検出 - ${modelName}）`);

  const prompt = buildPhase1Prompt(crawlResult);
  console.log(`[Analyzer] Phase 1 prompt: ${prompt.length} chars, ~${Math.ceil(prompt.length / 3)} tokens (est.)`);

  let aiResult: AIResponse;

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

      const cleaned = cleanJsonResponse(text);
      aiResult = JSON.parse(cleaned) as AIResponse;
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

  if (!aiResult!) {
    if (isRateLimitError(lastError)) {
      throw new Error('OpenAI APIのレート制限に達しました。しばらく待ってから再度お試しください。');
    }
    throw lastError;
  }

  // Phase 2: Extract common blocks using selectors (code-based)
  onProgress?.('共通ブロックのHTML抽出中...');

  const commonBlocks: AnalyzedCommonBlock[] = [];
  const selectors: string[] = [];

  if (aiResult.commonBlocks && Array.isArray(aiResult.commonBlocks)) {
    for (const block of aiResult.commonBlocks) {
      if (!block.selector) continue;
      selectors.push(block.selector);

      let html = '';
      for (const page of crawlResult.pages) {
        html = extractCommonBlockHtml(page, block.selector);
        if (html) break;
      }

      if (html) {
        commonBlocks.push({
          name: block.name || block.selector,
          html,
          css: '',
          position: block.position || 'other',
        });
      }
    }
  }

  // Phase 3: Extract page-specific content by removing common blocks (code-based)
  onProgress?.('ページ固有コンテンツの抽出中...');

  const aiPageMap = new Map<string, AIPageMeta>();
  if (aiResult.pages && Array.isArray(aiResult.pages)) {
    for (const p of aiResult.pages) {
      if (p.url) aiPageMap.set(p.url, p);
    }
  }

  const pages: AnalyzedPage[] = crawlResult.pages.map(page => {
    const meta = aiPageMap.get(page.url);
    const contentHtml = extractPageContent(page, selectors);

    return {
      url: page.url,
      title: meta?.title || page.title || '',
      slug: meta?.slug || inferSlugFromUrl(page.url),
      metaDescription: meta?.metaDescription || page.metaDescription || '',
      contentHtml,
      images: page.images,
    };
  });

  console.log(`[Analyzer] Done: ${commonBlocks.length} common blocks, ${pages.length} pages`);

  return {
    commonBlocks,
    pages,
    sharedCss: '',
  };
}
