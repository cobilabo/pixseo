import ShortCodeRenderer from './ShortCodeRenderer';
import { TableOfContentsItem } from '@/types/article';
import { InternalLinkStyle } from '@/types/theme';
import { Lang } from '@/types/lang';
import TableOfContents from './TableOfContents';
import ArticleClientExtras from './ArticleClientExtras';
import { normalizeInlineTocPlaceholder } from '@/lib/cleanWordPressHtml';
import { processHtmlBlocks } from '@/lib/article-utils';
import { stripInlineFontSizesFromHtml } from '@/lib/strip-inline-font-sizes';
import { unwrapDocsInternalGuidWrappers } from '@/lib/unwrap-invalid-inline-wrappers';

interface ArticleContentProps {
  content: string;
  tableOfContents?: TableOfContentsItem[];
  internalLinkStyle?: InternalLinkStyle;
  lang?: Lang;
  siteHost?: string;
}

function injectHeadingIds(
  html: string,
  toc: TableOfContentsItem[] | undefined,
): string {
  if (!html) return html;
  const tocItems = Array.isArray(toc) ? toc : [];
  let headingIndex = 0;
  return html.replace(/<(h2|h3|h4)\b([^>]*)>/gi, (_match, tag: string, attrs: string) => {
    const currentIndex = headingIndex++;
    let newAttrs = attrs;
    if (!/\bid\s*=/.test(attrs)) {
      const tocItem = tocItems[currentIndex];
      const id = tocItem?.id || `heading-${currentIndex}`;
      newAttrs += ` id="${id}"`;
    }
    if (/\bclass\s*=/.test(newAttrs)) {
      if (!/scroll-mt-20/.test(newAttrs)) {
        newAttrs = newAttrs.replace(
          /class\s*=\s*(["'])([^"']*)\1/i,
          (_m, q: string, cls: string) => `class=${q}${cls} scroll-mt-20${q}`
        );
      }
    } else {
      newAttrs += ' class="scroll-mt-20"';
    }
    return `<${tag}${newAttrs}>`;
  });
}

/** FV でタイトル表示済みのため、本文中の h1 は出さない */
function stripArticleBodyH1(html: string): string {
  return html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '');
}

/** 旧ドメインの絶対 URL を相対パスにする（href 属性のみ） */
function rewriteLegacyAyumiHrefs(html: string): string {
  return html.replace(
    /\bhref=(["'])https?:\/\/(?:www\.)?the-ayumi\.jp(\/[^"']*)?\1/gi,
    (_m, q: string, path?: string) => `href=${q}${path || '/'}${q}`
  );
}

export default function ArticleContent({
  content,
  tableOfContents,
  internalLinkStyle = 'text',
  lang = 'ja',
  siteHost = '',
}: ArticleContentProps) {
  const htmlBlockProcessed = processHtmlBlocks(content);
  const fontSizeNormalized = unwrapDocsInternalGuidWrappers(
    stripInlineFontSizesFromHtml(htmlBlockProcessed)
  );
  const tocNormalized = normalizeInlineTocPlaceholder(fontSizeNormalized);
  const shortcodeProcessed = ShortCodeRenderer.process(tocNormalized);
  const [processed] = processInternalLinksForBlogCard(
    shortcodeProcessed,
    internalLinkStyle,
    siteHost
  );
  const withHeadingIds = injectHeadingIds(
    rewriteLegacyAyumiHrefs(stripArticleBodyH1(processed)),
    tableOfContents
  );
  const processedContent = applyExternalLinkTargetsToHtml(withHeadingIds, siteHost)
    .replace(/<div\s+class="toc-placeholder"\s+data-toc="auto"\s*><\/div>/gi, '');

  const tocItems = Array.isArray(tableOfContents) ? tableOfContents : [];

  return (
    <>
      {tocItems.length > 0 && (
        <TableOfContents items={tocItems} lang={lang} />
      )}
      <div
        className="prose md:prose-lg max-w-none article-content"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
      <ArticleClientExtras content={content} lang={lang} />
    </>
  );
}

/**
 * 内部記事リンクをブログカードプレースホルダーに変換
 * @returns [処理後のHTML, 内部リンクURLの配列]
 */
function processInternalLinksForBlogCard(
  html: string, 
  internalLinkStyle: InternalLinkStyle,
  siteHost: string
): [string, string[]] {
  // ブログカード形式でない場合は何もしない
  if (internalLinkStyle !== 'blogcard') {
    return [html, []];
  }

  const internalLinkUrls: string[] = [];
  let processedHtml = html;

  // aタグを検索して内部リンクをプレースホルダーに置換
  // 「参照：」や「参照:」が前にある場合も含めてマッチする
  // <a href="...">...</a> の形式を検索
  const linkRegex = /(?:参照[：:]?\s*)?<a\s+([^>]*href=["']([^"']+)["'][^>]*)>([^<]*(?:<(?!\/a>)[^<]*)*)<\/a>/gi;
  
  processedHtml = processedHtml.replace(linkRegex, (match, attrs, href, linkText) => {
    // the-ayumi.jp のリンクを変換
    let normalizedHref = href;
    if (href.includes('the-ayumi.jp')) {
      normalizedHref = href.replace(/https?:\/\/the-ayumi\.jp/, '');
    }
    
    // 内部記事リンクかチェック
    if (checkIsInternalArticleLink(normalizedHref, siteHost)) {
      internalLinkUrls.push(normalizedHref);
      // プレースホルダーdivに置換（dangerouslySetInnerHTMLで挿入後にReactコンポーネントで置換）
      // href 内に既に % エンコードがある場合、encodeURIComponent だけだと % が二重化し API の slug がずれる
      let hrefForAttr: string;
      try {
        hrefForAttr = encodeURIComponent(decodeURIComponent(normalizedHref));
      } catch {
        hrefForAttr = encodeURIComponent(normalizedHref);
      }
      return `</p><div class="blogcard-placeholder" data-href="${hrefForAttr}"></div><p>`;
    }
    
    return match;
  });

  return [processedHtml, internalLinkUrls];
}

/** 記事本文の外部リンク（別ドメイン）かどうか */
function isExternalLinkHref(href: string, siteHost: string): boolean {
  if (!href?.trim()) return false;

  const trimmed = href.trim();
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return false;
  }

  // 同一サイト内の相対パス
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return false;
  }

  try {
    const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    if (!url.protocol.startsWith('http')) return false;

    if (siteHost && url.host === siteHost) return false;

    if (
      url.host.endsWith('.pixseo-preview.cloud') ||
      url.host.endsWith('.pixseo.app')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** dangerouslySetInnerHTML 経由の HTML 内の外部リンクに target を付与 */
function applyExternalLinkTargetsToHtml(html: string, siteHost: string): string {
  if (!html) return html;

  return html.replace(/<a\b([^>]*?)>/gi, (match, attrs: string) => {
    const hrefMatch = attrs.match(/\bhref=(["'])([^"']*)\1/i);
    if (!hrefMatch) return match;
    if (!isExternalLinkHref(hrefMatch[2], siteHost)) return match;
    if (/\btarget\s*=/.test(attrs)) return match;

    const trimmedAttrs = attrs.trim();
    return `<a ${trimmedAttrs} target="_blank" rel="noopener noreferrer">`;
  });
}

function checkIsInternalArticleLink(href: string, siteHost: string): boolean {
  // 相対パスで記事ページへのリンクの場合
  // /ja/articles/slug, /en/articles/slug, /articles/slug, /2024/01/10/slug/ など
  if (href.startsWith('/')) {
    // /ja/articles/slug または /articles/slug の形式をチェック
    if (/^\/(?:ja|en|zh|ko)\/articles\/[^\/]+\/?$/.test(href)) {
      return true;
    }
    if (/^\/articles\/[^\/]+\/?$/.test(href)) {
      return true;
    }
    // WordPress形式 /2024/01/10/slug/
    if (/^\/\d{4}\/\d{2}\/\d{2}\/[^\/]+\/?$/.test(href)) {
      return true;
    }
    return false;
  }

  // 絶対URLの場合
  try {
    const url = new URL(href);
    
    // 同じホストかどうかチェック
    if (siteHost && url.host !== siteHost) {
      // siteHostが設定されていて、異なるホストの場合は外部リンク
      return false;
    }
    
    // pixseo-preview.cloud または pixseo.app ドメインの場合は内部リンクとして扱う
    if (!url.host.endsWith('.pixseo-preview.cloud') && !url.host.endsWith('.pixseo.app')) {
      // その他のドメインの場合、siteHostと一致しない限り外部リンク
      if (!siteHost || url.host !== siteHost) {
        return false;
      }
    }
    
    // パスが記事ページかどうかチェック
    const pathname = url.pathname;
    if (/^\/(?:ja|en|zh|ko)\/articles\/[^\/]+\/?$/.test(pathname)) {
      return true;
    }
    if (/^\/articles\/[^\/]+\/?$/.test(pathname)) {
      return true;
    }
    // WordPress形式
    if (/^\/\d{4}\/\d{2}\/\d{2}\/[^\/]+\/?$/.test(pathname)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}



