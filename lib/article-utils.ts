import { normalizeInlineTocPlaceholder } from '@/lib/cleanWordPressHtml';
import type { Article, TableOfContentsItem } from '@/types/article';
import type { Page } from '@/types/page';
import type { Writer } from '@/types/writer';

const TOC_MARKER_SNIPPET =
  '<div class="toc-placeholder" data-toc="auto"></div>';

/**
 * Firestore に tableOfContents だけあり本文に目次マーカーが無い記事向け。
 * 管理画面エディタで ensureTocPlaceholderChrome が効くよう先頭に簡略マーカーを付与する。
 */
export function ensureInlineTocPlaceholderForAdminEditor(
  html: string,
  toc?: TableOfContentsItem[] | null
): string {
  const body = html || '';
  if (!toc || toc.length === 0) return body;
  if (body.includes('toc-placeholder') || body.includes('data-toc=')) {
    return body;
  }
  return `${TOC_MARKER_SNIPPET}\n${body}`;
}

/**
 * エディタの HTML ブロック（ツールバー付き）を data-html-content の実コンテンツに置換する。
 * 公開時の ArticleContent と目次生成の両方で同じ処理を使う。
 */
export function processHtmlBlocks(html: string): string {
  if (!html) return '';

  let result = html;
  let searchStart = 0;

  while (true) {
    const blockStartMatch = result.slice(searchStart).match(/<div[^>]*class="html-block"[^>]*>/i);
    if (!blockStartMatch || blockStartMatch.index === undefined) break;

    const absoluteBlockStart = searchStart + blockStartMatch.index;
    const openingTag = blockStartMatch[0];
    const contentMatch = openingTag.match(/data-html-content="([^"]*)"/);
    if (!contentMatch) {
      searchStart = absoluteBlockStart + openingTag.length;
      continue;
    }

    const encodedContent = contentMatch[1];
    let depth = 1;
    let pos = absoluteBlockStart + openingTag.length;

    while (depth > 0 && pos < result.length) {
      const nextOpen = result.indexOf('<div', pos);
      const nextClose = result.indexOf('</div>', pos);
      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) {
          const blockEnd = nextClose + 6;
          try {
            const decodedContent = decodeURIComponent(encodedContent);
            result = result.slice(0, absoluteBlockStart) + decodedContent + result.slice(blockEnd);
            searchStart = absoluteBlockStart + decodedContent.length;
          } catch {
            result = result.slice(0, absoluteBlockStart) + result.slice(blockEnd);
            searchStart = absoluteBlockStart;
          }
        } else {
          pos = nextClose + 6;
        }
      }
    }

    if (depth > 0) {
      searchStart = absoluteBlockStart + openingTag.length;
    }
  }

  return result;
}

/** 目次生成用にエディタ専用マークアップを除去した HTML を返す */
function contentForTableOfContents(content: string): string {
  return normalizeInlineTocPlaceholder(processHtmlBlocks(content || ''));
}

/**
 * HTML本文から目次を自動生成
 */
export function generateTableOfContents(content: string): TableOfContentsItem[] {
  const source = contentForTableOfContents(content);

  if (typeof window === 'undefined') {
    // サーバーサイドの場合は正規表現で解析
    const headingRegex = /<(h[234])[^>]*>(.*?)<\/\1>/gi;
    const toc: TableOfContentsItem[] = [];
    let match;
    let index = 0;

    while ((match = headingRegex.exec(source)) !== null) {
      const level = parseInt(match[1].substring(1)); // h2 -> 2
      const text = match[2].replace(/<[^>]*>/g, '').trim(); // HTMLタグを除去
      
      toc.push({
        id: `heading-${index}`,
        level,
        text,
      });
      
      index++;
    }

    return toc;
  }

  // クライアントサイドの場合はDOMParserを使用
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, 'text/html');
  const headings = doc.querySelectorAll('h2, h3, h4');

  return Array.from(headings).map((h, i) => ({
    id: `heading-${i}`,
    level: parseInt(h.tagName.substring(1)),
    text: h.textContent?.trim() || '',
  }));
}

/**
 * HTML本文から読了時間を計算（分）
 * 日本語：平均400-600文字/分 → 500文字/分で計算
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 0;

  // HTMLタグを除去
  const text = content.replace(/<[^>]*>/g, '');
  
  // 文字数をカウント
  const charCount = text.length;
  
  // 読了時間を計算（最低1分）
  const minutes = Math.max(1, Math.ceil(charCount / 500));
  
  return minutes;
}

/**
 * 目次付きHTMLを生成（見出しにIDを付与）
 */
export function addIdsToHeadings(content: string, toc: TableOfContentsItem[]): string {
  let result = content;
  
  toc.forEach((item) => {
    const levelTag = `h${item.level}`;
    // 最初に見つかった該当見出しにIDを付与
    const regex = new RegExp(`<${levelTag}([^>]*)>(${escapeRegex(item.text)})<\/${levelTag}>`, 'i');
    result = result.replace(regex, `<${levelTag} id="${item.id}"$1>$2</${levelTag}>`);
  });
  
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- WordPress /wp-content/uploads -> mediaLibrary URL (runtime + scripts) ---

export const WP_UPLOAD_IMAGE_RE =
  /https?:\/\/(?:www\.)?the-ayumi\.jp\/wp-content\/uploads\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s"'<>]*)?/gi;

const WP_CONTENT_FIELDS = [
  'content',
  'content_ja',
  'content_en',
  'content_zh',
  'content_ko',
] as const;

const WP_EXCERPT_FIELDS = [
  'excerpt',
  'excerpt_ja',
  'excerpt_en',
  'excerpt_zh',
  'excerpt_ko',
] as const;

const WP_PAGE_CONTENT_FIELDS = [
  'content',
  'content_ja',
  'content_en',
  'content_zh',
  'content_ko',
] as const;

export function canonicalWpMediaUrl(href: string): string {
  try {
    const u = new URL(href.trim());
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    const pathname = decodeURI(u.pathname);
    return `https://${host}${pathname}${u.search}`;
  } catch {
    return href.trim();
  }
}

/**
 * WordPress が付ける -150x150 や -scaled を拡張子直前から除いた pathname バリエーション。
 * ライターアイコン等のサムネ URL と mediaLibrary の wpOriginalUrl（フルサイズ）を繋ぐ。
 */
function wpPathnameVariants(pathname: string): string[] {
  const dec = decodeURI(pathname);
  const d1 = dec.replace(/-(\d+)x(\d+)(?=\.[^.]+$)/i, '');
  const s1 = dec.replace(/-scaled(?=\.[^.]+$)/i, '');
  const ds = d1.replace(/-scaled(?=\.[^.]+$)/i, '');
  const sd = s1.replace(/-(\d+)x(\d+)(?=\.[^.]+$)/i, '');
  return [...new Set([dec, d1, s1, ds, sd])];
}

/** マップ照合に使う URL キー（canonical・パーセントエンコード・サイズサフィックス除去） */
function expandWpUploadUrlLookupKeys(href: string): string[] {
  const keys = new Set<string>();
  const push = (s: string) => {
    const t = s.trim();
    if (!t) return;
    keys.add(t);
    keys.add(canonicalWpMediaUrl(t));
  };
  push(href);
  try {
    const u = new URL(href.trim());
    const search = u.search;
    for (const pathVar of wpPathnameVariants(u.pathname)) {
      const rebuilt = `${u.protocol}//${u.hostname}${pathVar}${search}`;
      push(rebuilt);
      try {
        keys.add(`${u.protocol}//${u.host}${encodeURI(pathVar)}${search}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* invalid URL */
  }
  return [...keys];
}

/** uploads/ 以降の相対パス（拡張子・-150x150・-scaled 除去・小文字）。ファイル名のみキーは衝突で誤置換するため使わない */
const WP_STEM_REL_PREFIX = '__wpstemrel__:';

function wpUploadRelativeStem(href: string): string | null {
  try {
    const u = new URL(href.trim());
    const lower = u.pathname.toLowerCase();
    const marker = '/wp-content/uploads/';
    const idx = lower.indexOf(marker);
    if (idx === -1) return null;
    let rel = u.pathname.slice(idx + marker.length);
    try {
      rel = decodeURIComponent(decodeURI(rel));
    } catch {
      try {
        rel = decodeURI(rel);
      } catch {
        /* keep */
      }
    }
    const noExt = rel.replace(/\.[^./]+$/i, '');
    const stem = noExt
      .replace(/-(\d+)x(\d+)$/i, '')
      .replace(/-scaled$/i, '');
    const norm = stem.replace(/\\/g, '/').toLowerCase().replace(/^\/+|\/+$/g, '');
    return norm || null;
  } catch {
    return null;
  }
}

function lookupWpReplacement(map: Map<string, string>, matched: string): string | undefined {
  for (const key of expandWpUploadUrlLookupKeys(matched)) {
    const v = map.get(key);
    if (v) return v;
  }
  const relStem = wpUploadRelativeStem(matched);
  if (relStem) {
    const v = map.get(WP_STEM_REL_PREFIX + relStem);
    if (v) return v;
  }
  return undefined;
}

export function rewriteWpUploadUrlsInString(
  s: string | undefined | null,
  map: Map<string, string>
): string {
  if (s == null || s === '') return s ?? '';
  if (!s.includes('wp-content')) return s;
  return s.replace(WP_UPLOAD_IMAGE_RE, (match) => lookupWpReplacement(map, match) ?? match);
}

type WpMapDoc = { data: () => Record<string, unknown> };

export function buildWpMediaReplacementMapFromDocs(docs: WpMapDoc[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const doc of docs) {
    const d = doc.data();
    const wp = typeof d.wpOriginalUrl === 'string' ? d.wpOriginalUrl.trim() : '';
    const url = typeof d.url === 'string' ? d.url.trim() : '';
    if (!wp || !url) continue;
    for (const key of expandWpUploadUrlLookupKeys(wp)) {
      map.set(key, url);
    }
    if (wp.startsWith('http://')) {
      const https = wp.replace(/^http:\/\//i, 'https://');
      for (const key of expandWpUploadUrlLookupKeys(https)) {
        map.set(key, url);
      }
    }
    const relStem = wpUploadRelativeStem(wp);
    if (relStem) map.set(WP_STEM_REL_PREFIX + relStem, url);
  }
  return map;
}

export function rewriteArticleWpMediaUrls(article: Article, map: Map<string, string>): void {
  if (map.size === 0) return;
  const a = article as unknown as Record<string, unknown>;
  for (const f of WP_CONTENT_FIELDS) {
    if (typeof a[f] === 'string') a[f] = rewriteWpUploadUrlsInString(a[f] as string, map);
  }
  for (const f of WP_EXCERPT_FIELDS) {
    if (typeof a[f] === 'string') a[f] = rewriteWpUploadUrlsInString(a[f] as string, map);
  }
  if (typeof article.featuredImage === 'string') {
    article.featuredImage = rewriteWpUploadUrlsInString(article.featuredImage, map);
  }

  const faqKeys = ['faqs', 'faqs_ja', 'faqs_en', 'faqs_zh', 'faqs_ko'] as const;
  for (const key of faqKeys) {
    const faqs = a[key];
    if (!Array.isArray(faqs)) continue;
    for (const item of faqs as { question?: string; answer?: string }[]) {
      if (item?.question) item.question = rewriteWpUploadUrlsInString(item.question, map);
      if (item?.answer) item.answer = rewriteWpUploadUrlsInString(item.answer, map);
    }
  }
}

export function rewriteWriterWpMediaUrls(writer: Writer, map: Map<string, string>): void {
  if (map.size === 0) return;
  if (writer.icon) writer.icon = rewriteWpUploadUrlsInString(writer.icon, map);
  if (writer.backgroundImage) {
    writer.backgroundImage = rewriteWpUploadUrlsInString(writer.backgroundImage, map);
  }
}

function deepRewriteWpStrings(value: unknown, rewriter: (s: string) => string): unknown {
  if (typeof value === 'string') return rewriter(value);
  if (Array.isArray(value)) return value.map((x) => deepRewriteWpStrings(x, rewriter));
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      out[k] = deepRewriteWpStrings(o[k], rewriter);
    }
    return out;
  }
  return value;
}

export function articleMayContainWpUploads(a: Article): boolean {
  if (a.featuredImage?.includes('wp-content/uploads')) return true;
  const keys = [...WP_CONTENT_FIELDS, ...WP_EXCERPT_FIELDS] as readonly string[];
  const o = a as unknown as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.includes('wp-content/uploads')) return true;
  }
  return false;
}

export function writerMayContainWpUploads(w: Writer): boolean {
  return Boolean(
    (w.icon && w.icon.includes('wp-content/uploads')) ||
    (w.backgroundImage && w.backgroundImage.includes('wp-content/uploads'))
  );
}

export function pageMayContainWpUploads(p: Page): boolean {
  if (p.featuredImage?.includes('wp-content/uploads')) return true;
  const o = p as unknown as Record<string, unknown>;
  for (const f of [
    ...WP_PAGE_CONTENT_FIELDS,
    'excerpt',
    'excerpt_ja',
    'excerpt_en',
    'excerpt_zh',
    'excerpt_ko',
  ]) {
    const v = o[f];
    if (typeof v === 'string' && v.includes('wp-content/uploads')) return true;
  }
  if (p.blocks?.length) {
    try {
      if (JSON.stringify(p.blocks).includes('wp-content/uploads')) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export function rewritePageWpMediaUrls(page: Page, map: Map<string, string>): void {
  if (map.size === 0) return;
  const p = page as unknown as Record<string, unknown>;
  for (const f of WP_PAGE_CONTENT_FIELDS) {
    if (typeof p[f] === 'string') p[f] = rewriteWpUploadUrlsInString(p[f] as string, map);
  }
  if (typeof page.excerpt === 'string') {
    page.excerpt = rewriteWpUploadUrlsInString(page.excerpt, map);
  }
  for (const suf of ['_ja', '_en', '_zh', '_ko'] as const) {
    const k = `excerpt${suf}`;
    if (typeof p[k] === 'string') p[k] = rewriteWpUploadUrlsInString(p[k] as string, map);
  }
  if (typeof page.featuredImage === 'string') {
    page.featuredImage = rewriteWpUploadUrlsInString(page.featuredImage, map);
  }
  if (page.blocks && Array.isArray(page.blocks) && page.blocks.length > 0) {
    const rw = (s: string) => rewriteWpUploadUrlsInString(s, map);
    page.blocks = deepRewriteWpStrings(page.blocks, rw) as Page['blocks'];
  }
}

