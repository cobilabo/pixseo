'use client';

import { useEffect, useRef, useMemo } from 'react';
import parse, { DOMNode, Element } from 'html-react-parser';
import Image from 'next/image';
import YouTubeEmbed from './YouTubeEmbed';
import ShortCodeRenderer from './ShortCodeRenderer';
import BlogCard from './BlogCard';
import { TableOfContentsItem } from '@/types/article';
import { InternalLinkStyle } from '@/types/theme';
import { Lang } from '@/types/lang';
import TableOfContents from './TableOfContents';
import { normalizeInlineTocPlaceholder } from '@/lib/cleanWordPressHtml';
import { processHtmlBlocks } from '@/lib/article-utils';
import { isSrcAllowedForNextImage } from '@/lib/next-image-allowed-hosts';
import { htmlAttribsToReactProps } from '@/lib/html-attribs-to-react';

interface ArticleContentProps {
  content: string;
  tableOfContents?: TableOfContentsItem[];
  internalLinkStyle?: InternalLinkStyle;
  lang?: Lang;
  siteHost?: string;
  /** 目次プレースホルダーを記事本文中に差し替える際にヘッダに表示するファビコン */
  faviconUrl?: string;
}

function injectHeadingIds(
  html: string,
  toc: TableOfContentsItem[] | undefined,
): string {
  if (!html) return html;
  const tocItems = Array.isArray(toc) ? toc : [];
  let headingIndex = 0;
  return html.replace(/<(h2|h3|h4)\b([^>]*)>/gi, (match, tag, attrs) => {
    const currentIndex = headingIndex++;
    if (/\bid\s*=\s*["']/.test(attrs)) {
      return match;
    }
    const tocItem = tocItems[currentIndex];
    const id = tocItem?.id || `heading-${currentIndex}`;
    return `<${tag}${attrs} id="${id}">`;
  });
}

/** html-react-parser の DOM ノードからテキストを再帰的に抽出 */
function extractDomNodeText(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const n = node as { type?: string; data?: string; children?: unknown };
  if (n.type === 'text' && typeof n.data === 'string') return n.data;
  if (typeof n.data === 'string') return n.data;
  if (Array.isArray(n.children)) {
    return n.children.map(extractDomNodeText).join('');
  }
  if (n.children) {
    return extractDomNodeText(n.children);
  }
  return '';
}

export default function ArticleContent({
  content, 
  tableOfContents, 
  internalLinkStyle = 'text',
  lang = 'ja',
  siteHost = '',
  faviconUrl,
}: ArticleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // コンテンツ処理をメモ化して再計算を防ぐ
  const { processedContent, contentSegments } = useMemo(() => {
    // HTMLブロックを実際のHTMLコンテンツに変換
    const htmlBlockProcessed = processHtmlBlocks(content);

    // エディタの目次プレースホルダー（装飾チャンク含む）をシンプルなマーカーに正規化
    const tocNormalized = normalizeInlineTocPlaceholder(htmlBlockProcessed);

    // ショートコードを処理
    const shortcodeProcessed = ShortCodeRenderer.process(tocNormalized);

    // 内部リンクをブログカードプレースホルダーに変換（ブログカード形式の場合のみ）
    const [processed] = processInternalLinksForBlogCard(
      shortcodeProcessed,
      internalLinkStyle,
      siteHost
    );

    // dangerouslySetInnerHTML ルートでも TOC クリック→スクロールが効くよう、
    // 事前に見出しへ id 属性を注入しておく。html-react-parser ルートでは
    // replace() が id を付けるが、先に入っていてもそちらが尊重される。
    const withHeadingIds = injectHeadingIds(processed, tableOfContents);

    // コンテンツをセグメントに分割（BlogCard と 目次プレースホルダー）
    const segments = splitContentByPlaceholders(withHeadingIds);

    return { processedContent: withHeadingIds, contentSegments: segments };
  }, [content, internalLinkStyle, siteHost, tableOfContents]);

  // Instagram埋め込みとスクリプトタグを処理するuseEffect（クライアントマウント後にのみ実行）
  useEffect(() => {

    // Instagram埋め込みスクリプトをロード
    const loadInstagramScript = () => {
      // すでにスクリプトが存在する場合は、processを実行
      if ((window as any).instgrm) {
        (window as any).instgrm.Embeds.process();
        return;
      }

      // スクリプトが存在しない場合は、新規追加
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.instagram.com/embed.js';
      script.onload = () => {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }
      };
      document.body.appendChild(script);
    };

    // Instagram埋め込みが含まれている場合のみスクリプトをロード
    if (content.includes('instagram-media')) {
      loadInstagramScript();
    }

    // スクリプトタグが含まれている場合、dangerouslySetInnerHTMLで挿入されたスクリプトを実行
    if (content.includes('<script')) {
      // コンテンツエリア内のスクリプトタグを実行
      const contentElement = document.querySelector('.article-content');
      if (contentElement) {
        const scripts = contentElement.querySelectorAll('script');
        scripts.forEach((oldScript) => {
          // 既に実行済みのスクリプトをスキップ
          if (oldScript.hasAttribute('data-executed')) return;
          
          const newScript = document.createElement('script');
          // スクリプトの属性をコピー
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          // スクリプトの内容をコピー
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          // 実行済みフラグを設定
          oldScript.setAttribute('data-executed', 'true');
          // 新しいスクリプトを実行
          document.body.appendChild(newScript);
        });
      }
    }
  }, [content]);

  // 見出しの出現順をカウント
  let headingCount = 0;

  // HTMLをパースしてReactコンポーネントに変換
  const options = {
    replace: (domNode: any) => {
      // Instagram埋め込みはそのままスキップ（変換しない）
      if (domNode.name === 'blockquote' && domNode.attribs?.class?.includes('instagram-media')) {
        // 変換せずにそのまま表示（html-react-parserが自動で処理）
        return undefined;
      }

      // YouTube埋め込みを検出して変換
      if (domNode.name === 'iframe' && domNode.attribs?.src?.includes('youtube.com')) {
        const youtubeId = extractYouTubeId(domNode.attribs.src);
        if (youtubeId) {
          return <YouTubeEmbed videoId={youtubeId} />;
        }
      }

      // 画像: next.config で許可されたホストのみ Next/Image（それ以外は <img> で未設定ホストエラーを防ぐ）
      if (domNode.name === 'img' && domNode.attribs?.src) {
        const { src, alt = '' } = domNode.attribs;

        if (!isSrcAllowedForNextImage(src)) {
          return (
            <span className="block my-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="rounded-lg w-full h-auto"
                loading="lazy"
              />
            </span>
          );
        }

        return (
          <span className="block my-6">
            <Image
              src={src}
              alt={alt}
              width={800}
              height={450}
              className="rounded-lg w-full h-auto"
              loading="lazy"
            />
          </span>
        );
      }

      // 内部リンクを修正（the-ayumi.jp → 現在のホスト）
      if (domNode.name === 'a' && domNode.attribs?.href) {
        const { href, ...anchorAttribs } = domNode.attribs;

        // the-ayumi.jpへのリンクを現在のホストに変換
        let newHref = href;
        if (href.includes('the-ayumi.jp')) {
          // /2024/01/10/disability-certificate/ のような相対パスに変換
          newHref = href.replace(/https?:\/\/the-ayumi\.jp/, '');
        }

        // 内部記事リンクかどうかチェック
        const isInternalArticleLink = checkIsInternalArticleLink(
          newHref,
          siteHost
        );

        // ブログカード形式で表示する場合
        if (internalLinkStyle === 'blogcard' && isInternalArticleLink) {
          // 親がp要素の場合、ブロック要素として表示するために適切に処理
          return <BlogCard href={newHref} lang={lang} />;
        }

        // リンクの内容を抽出（Google Docs 由来の <a><span>…</span></a> も含む）
        const linkText =
          (domNode.children
            ? Array.isArray(domNode.children)
              ? domNode.children.map(extractDomNodeText).join('')
              : extractDomNodeText(domNode.children)
            : '') || newHref;

        // HTML の style 文字列・class を React 用に変換（style 文字列は React 19 で #62 エラーになる）
        const linkProps = htmlAttribsToReactProps(anchorAttribs);
        const isExternal = isExternalLinkHref(newHref, siteHost);
        const { target: _target, rel: _rel, ...restLinkProps } = linkProps;

        return (
          <a
            href={newHref}
            {...restLinkProps}
            {...(isExternal
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {linkText}
          </a>
        );
      }

      // 目次プレースホルダーを目次コンポーネントに置換
      if (
        domNode.name === 'div' &&
        (domNode.attribs?.class?.split(/\s+/).includes('toc-placeholder') ||
          domNode.attribs?.['data-toc'] === 'auto')
      ) {
        return (
          <TableOfContents
            items={Array.isArray(tableOfContents) ? tableOfContents : []}
            faviconUrl={faviconUrl}
            lang={lang}
          />
        );
      }

      // h1タグを除外（FVで既にタイトル表示済み）
      if (domNode.name === 'h1') {
        return <></>;
      }

      // 見出し（h2, h3, h4）にIDを付与
      if (domNode.name && ['h2', 'h3', 'h4'].includes(domNode.name)) {
        const tocItem = Array.isArray(tableOfContents) ? tableOfContents[headingCount] : undefined;
        const id = tocItem?.id || `heading-${headingCount}`;
        headingCount++;

        const Tag = domNode.name as 'h2' | 'h3' | 'h4';

        const textContent = domNode.children
          ? Array.isArray(domNode.children)
            ? domNode.children.map(extractDomNodeText).join('')
            : extractDomNodeText(domNode.children)
          : '';
        
        return (
          <Tag id={id} className="scroll-mt-20">
            {textContent || ''}
          </Tag>
        );
      }

      // その他の要素はそのまま返す（undefinedで元のノードを使用）
      return undefined;
    },
  };

  // SSR でも本文を出力する（Googlebot に本文を認識させるため）
  // 以前はクライアントマウント後にのみ本文を表示していたが、SEO 観点で初期 HTML に本文を含める

  // スクリプトタグや埋め込みコンテンツが含まれているかをチェック
  const hasScriptTag = /<script[\s\S]*?>[\s\S]*?<\/script>/i.test(processedContent);
  const hasGoogleMapsIframe = /<iframe[\s\S]*?src=["'][^"']*(?:maps\.google\.com|google\.com\/maps)[^"']*["'][\s\S]*?>/i.test(processedContent);
  const hasInstagramEmbed = processedContent.includes('instagram-media');

  const hasBlogCards = contentSegments.some(seg => seg.type === 'blogcard');
  const hasTocPlaceholder = contentSegments.some(seg => seg.type === 'toc');
  const mustBypassParser = hasScriptTag || hasGoogleMapsIframe || hasInstagramEmbed;
  const mustSegment = hasBlogCards || hasTocPlaceholder || mustBypassParser;

  const tocItems = Array.isArray(tableOfContents) ? tableOfContents : [];

  const renderSegment = (segment: ContentSegment, index: number) => {
    if (segment.type === 'blogcard') {
      return <BlogCard key={`blogcard-${index}`} href={segment.content} lang={lang} />;
    }
    if (segment.type === 'toc') {
      return (
        <TableOfContents
          key={`toc-${index}`}
          items={tocItems}
          faviconUrl={faviconUrl}
          lang={lang}
        />
      );
    }
    // html セグメント：スクリプトや埋め込みがある場合は dangerouslySetInnerHTML、
    // そうでなければ html-react-parser で React コンポーネントに変換する。
    if (mustBypassParser) {
      return (
        <div
          key={`segment-${index}`}
          dangerouslySetInnerHTML={{
            __html: applyExternalLinkTargetsToHtml(segment.content, siteHost),
          }}
        />
      );
    }
    return <span key={`segment-${index}`}>{parse(segment.content, options)}</span>;
  };

  // セグメント分割が必要なケース（BlogCard / 目次プレースホルダー / 埋め込み）
  if (mustSegment) {
    return (
      <div ref={contentRef} className="prose prose-lg max-w-none article-content">
        {contentSegments.map(renderSegment)}
      </div>
    );
  }

  // 通常のパース処理
  return (
    <div ref={contentRef} className="prose prose-lg max-w-none article-content">
      {parse(processedContent, options)}
    </div>
  );
}

// グローバルスタイル（可読性向上）
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .article-content {
      line-height: 2.0 !important;
      letter-spacing: 0.02em !important;
    }
    .article-content p {
      line-height: 2.0 !important;
      letter-spacing: 0.02em !important;
      margin-bottom: 1.5em !important;
    }
    .article-content h2 {
      font-size: 1.375em !important;
      line-height: 1.6 !important;
      letter-spacing: 0.02em !important;
      margin-top: 2em !important;
      margin-bottom: 1em !important;
      font-weight: 700 !important;
      padding-bottom: 0.5em !important;
      color: #111827 !important;
      position: relative !important;
      border-bottom: none !important;
    }
    .article-content h2::after {
      content: '' !important;
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 6px !important;
      background-color: var(--primary-color, #3b82f6) !important;
      border-radius: 3px !important;
    }
    .article-content h3 {
      font-size: 1.25em !important;
      line-height: 1.6 !important;
      letter-spacing: 0.02em !important;
      margin-top: 1.8em !important;
      margin-bottom: 0.8em !important;
      font-weight: 600 !important;
      padding-bottom: 0.5em !important;
      padding-left: 0 !important;
      position: relative !important;
      border-bottom: none !important;
      border-left: none !important;
    }
    .article-content h3::after {
      content: '' !important;
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 3px !important;
      background-color: var(--primary-color, #3b82f6) !important;
      border-radius: 1.5px !important;
    }
    .article-content h4 {
      font-size: 1.125em !important;
      line-height: 1.6 !important;
      letter-spacing: 0.02em !important;
      margin-top: 1.5em !important;
      margin-bottom: 0.6em !important;
      font-weight: 600 !important;
      padding-bottom: 0.25em !important;
      border-bottom: 2px solid var(--primary-color, #3b82f6) !important;
    }
    .article-content ul,
    .article-content ol {
      line-height: 2.0 !important;
      letter-spacing: 0.02em !important;
      counter-reset: list-counter !important;
      list-style: none !important;
      padding-left: 0 !important;
    }
    .article-content ol {
      counter-reset: list-counter !important;
    }
    .article-content li {
      margin-bottom: 0.75em !important;
      padding: 0.75em 1em !important;
      background: transparent !important;
      border: 2px solid var(--border-color, #e5e7eb) !important;
      border-radius: 8px !important;
      position: relative !important;
      counter-increment: list-counter !important;
      font-size: 0.9em !important;
    }
    .article-content ol > li::before {
      content: "No. " counter(list-counter) !important;
      display: inline-block !important;
      margin-right: 0.5em !important;
      font-weight: 700 !important;
      color: var(--primary-color, #3b82f6) !important;
      font-size: 0.875em !important;
    }
    .article-content ul > li::before {
      content: "" !important;
    }
    .article-content table {
      width: 100% !important;
      border-collapse: separate !important;
      border-spacing: 0 !important;
      margin: 2em 0 !important;
      font-size: 0.875em !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      border: 1px solid var(--border-color, #e5e7eb) !important;
    }
    .article-content table thead {
      background-color: var(--block-background-color, #f9fafb) !important;
    }
    .article-content table th {
      padding: 0.75em 1em !important;
      text-align: left !important;
      font-weight: 600 !important;
      border-bottom: 2px solid var(--border-color, #e5e7eb) !important;
    }
    .article-content table thead tr:first-child th:first-child {
      border-top-left-radius: 7px !important;
    }
    .article-content table thead tr:first-child th:last-child {
      border-top-right-radius: 7px !important;
    }
    .article-content table td {
      padding: 0.75em 1em !important;
      border-bottom: 1px solid var(--border-color, #e5e7eb) !important;
    }
    .article-content table tbody tr:last-child td {
      border-bottom: none !important;
    }
    .article-content table tbody tr:last-child td:first-child {
      border-bottom-left-radius: 7px !important;
    }
    .article-content table tbody tr:last-child td:last-child {
      border-bottom-right-radius: 7px !important;
    }
    .article-content table tbody tr:hover {
      background-color: var(--block-background-color, #f9fafb) !important;
    }
    .article-content {
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }
    .article-content a {
      word-break: break-all !important;
      overflow-wrap: break-word !important;
    }
    /* 目次カード（TableOfContents）のスタイルを記事本文 CSS から保護する
       .article-content 内に描画されたときに h2/img/ul/li の装飾が漏れないようにリセット。
       ※ テーマ側 (.theme-furatto-default article .article-content h2) との特異度比較で
          勝てるようクラス重ね書き (.toc-card.toc-card) でスコアを底上げしている */
    .article-content .toc-card.toc-card,
    .article-content .toc-card.toc-card * {
      word-break: normal !important;
      overflow-wrap: normal !important;
    }
    .article-content .toc-card.toc-card h2 {
      font-size: 1.125rem !important;
      line-height: 1.75rem !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-top: none !important;
      border-right: none !important;
      border-bottom: none !important;
      border-left: none !important;
      color: inherit !important;
      position: static !important;
      letter-spacing: normal !important;
      white-space: nowrap !important;
    }
    .article-content .toc-card.toc-card h2::before,
    .article-content .toc-card.toc-card h2::after {
      display: none !important;
      content: none !important;
      background: none !important;
      border: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    .article-content .toc-card.toc-card img {
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    .article-content .toc-card.toc-card ul,
    .article-content .toc-card.toc-card ol {
      margin: 0 !important;
      padding: 0 !important;
      list-style: none !important;
      counter-reset: none !important;
    }
    /* リスト項目の枠線・カウンタ装飾を打ち消し */
    .article-content .toc-card.toc-card li,
    .article-content .toc-inline li {
      border: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin-bottom: 0 !important;
      background: transparent !important;
      counter-increment: none !important;
    }
    /* Tailwind の levelStyles (text-base / text-sm) を固定ピクセル値で適用し、
       .article-content li の font-size: 0.9em が目次に漏れないようにする */
    .article-content .toc-card.toc-card li.text-base,
    .article-content .toc-card.toc-card li.text-base * {
      font-size: 1rem !important;
      line-height: 1.5rem !important;
    }
    .article-content .toc-card.toc-card li.text-sm,
    .article-content .toc-card.toc-card li.text-sm * {
      font-size: 0.875rem !important;
      line-height: 1.375rem !important;
    }
    .article-content .toc-card.toc-card li.text-xs,
    .article-content .toc-card.toc-card li.text-xs * {
      font-size: 0.75rem !important;
      line-height: 1rem !important;
    }
    .article-content .toc-card.toc-card li::before,
    .article-content .toc-card.toc-card li::after,
    .article-content .toc-inline li::before {
      display: none !important;
      content: none !important;
    }
    /* H2 レベル項目の区切り線だけは TableOfContents 側で付けている border-t を残す */
    .article-content .toc-card.toc-card li.border-t {
      border-top: 1px solid #e5e7eb !important;
      padding-top: 0.5rem !important;
      margin-top: 0.5rem !important;
    }
    /* BlogCard専用スタイルリセット */
    .article-content .blogcard-wrapper {
      display: block !important;
      margin: 16px 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      position: relative !important;
    }
    .article-content .blogcard-label {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      background: #3b82f6 !important;
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      padding: 4px 12px !important;
      margin: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      line-height: 1.4 !important;
    }
    .article-content .blogcard-label-icon {
      width: 14px !important;
      height: 14px !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .article-content .blogcard-link {
      display: flex !important;
      flex-direction: row !important;
      align-items: stretch !important;
      text-decoration: none !important;
      color: inherit !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      background: #fff !important;
      min-height: 0 !important;
    }
    .article-content .blogcard-link:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }
    .article-content .blogcard-thumbnail {
      width: min(240px, 42vw) !important;
      min-width: 0 !important;
      max-width: min(240px, 42vw) !important;
      aspect-ratio: 4 / 3 !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      position: relative !important;
      flex-shrink: 0 !important;
      background: #f3f4f6 !important;
      align-self: center !important;
      overflow: hidden !important;
    }
    .article-content .blogcard-thumbnail > span,
    .article-content .blogcard-thumbnail > div {
      margin: 0 !important;
      padding: 0 !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }
    .article-content .blogcard-thumbnail img {
      margin: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
    }
    @media (max-width: 639px) {
      .article-content .blogcard-link {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .article-content .blogcard-thumbnail {
        width: 100% !important;
        max-width: none !important;
        align-self: stretch !important;
      }
      .article-content .blogcard-content {
        justify-content: flex-start !important;
      }
    }
    .article-content .blogcard-content {
      flex: 1 !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 12px 16px !important;
      gap: 8px !important;
      justify-content: center !important;
      margin: 0 !important;
      border: none !important;
    }
    .article-content .blogcard-meta {
      font-size: 11px !important;
      color: #6b7280 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      line-height: 1.4 !important;
      font-weight: normal !important;
    }
    .article-content .blogcard-meta-footer {
      display: flex !important;
      flex-direction: row !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 8px !important;
      margin-top: auto !important;
      margin-bottom: 0 !important;
    }
    .article-content .blogcard-writer {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      text-align: left !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      color: #6b7280 !important;
    }
    .article-content .blogcard-meta::before,
    .article-content .blogcard-meta::after {
      display: none !important;
      content: none !important;
    }
    .article-content .blogcard-date {
      flex-shrink: 0 !important;
      color: #6b7280 !important;
      font-weight: 500 !important;
      text-align: right !important;
    }
    .article-content .blogcard-title {
      font-size: 15px !important;
      font-weight: 700 !important;
      color: #111827 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-bottom: none !important;
      line-height: 1.4 !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
    }
    .article-content .blogcard-title::before,
    .article-content .blogcard-title::after {
      display: none !important;
      content: none !important;
    }
    .article-content .blogcard-link:hover .blogcard-title {
      color: #f97316 !important;
    }
    .article-content .blogcard-description {
      font-size: 13px !important;
      color: #4b5563 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      line-height: 1.5 !important;
      font-weight: normal !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 3 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
    }
    .article-content .blogcard-description::before,
    .article-content .blogcard-description::after {
      display: none !important;
      content: none !important;
    }
  `;
  if (!document.querySelector('#article-content-styles')) {
    style.id = 'article-content-styles';
    document.head.appendChild(style);
  }
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * URLが内部記事リンクかどうかをチェック
 * @param href リンクのURL
 * @param siteHost サイトのホスト（例: "example.pixseo-preview.cloud" or "example.com"）
 * @returns 内部記事リンクの場合true
 */
interface ContentSegment {
  type: 'html' | 'blogcard' | 'toc';
  /** html: HTML 文字列 / blogcard: href / toc: 空文字 */
  content: string;
}

/**
 * コンテンツを「blogcard プレースホルダー」と「目次プレースホルダー」で分割する。
 * ※ 事前に normalizeInlineTocPlaceholder で目次は `TOC_MARKER_HTML` の形に揃えてあることを前提とする。
 */
function splitContentByPlaceholders(html: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  // blogcard / toc のどちらかにマッチする regex を 1 本にまとめて左から順に処理する。
  const combinedRegex = new RegExp(
    '<div\\s+class="blogcard-placeholder"\\s+data-href="([^"]+)"\\s*></div>' +
      '|' +
      '<div\\s+class="toc-placeholder"\\s+data-toc="auto"\\s*></div>',
    'gi',
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'html', content: html.substring(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      segments.push({ type: 'blogcard', content: decodeURIComponent(match[1]) });
    } else {
      segments.push({ type: 'toc', content: '' });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    segments.push({ type: 'html', content: html.substring(lastIndex) });
  }

  return segments;
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
      return `<div class="blogcard-placeholder" data-href="${hrefForAttr}"></div>`;
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


