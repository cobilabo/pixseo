'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import parse, { DOMNode, Element } from 'html-react-parser';
import Image from 'next/image';
import YouTubeEmbed from './YouTubeEmbed';
import ShortCodeRenderer from './ShortCodeRenderer';
import BlogCard from './BlogCard';
import { TableOfContentsItem } from '@/types/article';
import { InternalLinkStyle } from '@/types/theme';
import { Lang } from '@/types/lang';

interface ArticleContentProps {
  content: string;
  tableOfContents?: TableOfContentsItem[];
  internalLinkStyle?: InternalLinkStyle;
  lang?: Lang;
  siteHost?: string;
}

/**
 * エディタのHTMLブロック構造を実際のHTMLコンテンツに変換する
 * ネストされたdiv構造を正しく処理するため、開始タグと終了タグをカウントする
 */
function processHtmlBlocks(html: string): string {
  if (!html) return '';
  
  let result = html;
  let searchStart = 0;
  
  while (true) {
    // html-blockの開始位置を検索
    const blockStartMatch = result.slice(searchStart).match(/<div[^>]*class="html-block"[^>]*>/i);
    if (!blockStartMatch || blockStartMatch.index === undefined) break;
    
    const absoluteBlockStart = searchStart + blockStartMatch.index;
    const openingTag = blockStartMatch[0];
    
    // data-html-content属性を抽出
    const contentMatch = openingTag.match(/data-html-content="([^"]*)"/);
    if (!contentMatch) {
      // data-html-contentがない場合はスキップして次を検索
      searchStart = absoluteBlockStart + openingTag.length;
      continue;
    }
    
    const encodedContent = contentMatch[1];
    
    // ネストされたdivを考慮して対応する閉じタグを見つける
    let depth = 1;
    let pos = absoluteBlockStart + openingTag.length;
    
    while (depth > 0 && pos < result.length) {
      const nextOpen = result.indexOf('<div', pos);
      const nextClose = result.indexOf('</div>', pos);
      
      if (nextClose === -1) break; // 閉じタグが見つからない
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // 開きタグが先に見つかった
        depth++;
        pos = nextOpen + 4;
      } else {
        // 閉じタグが先に見つかった
        depth--;
        if (depth === 0) {
          // 対応する閉じタグを見つけた
          const blockEnd = nextClose + 6; // '</div>'.length
          
          try {
            // URLエンコードされたコンテンツをデコード
            const decodedContent = decodeURIComponent(encodedContent);
            
            // ブロック全体を置換
            result = result.slice(0, absoluteBlockStart) + decodedContent + result.slice(blockEnd);
            
            // 置換後の位置から次の検索を開始
            searchStart = absoluteBlockStart + decodedContent.length;
          } catch (e) {
            console.error('Failed to decode HTML block content:', e);
            // デコードに失敗した場合はブロックを削除
            result = result.slice(0, absoluteBlockStart) + result.slice(blockEnd);
            searchStart = absoluteBlockStart;
          }
        } else {
          pos = nextClose + 6;
        }
      }
    }
    
    // 閉じタグが見つからなかった場合は次を検索
    if (depth > 0) {
      searchStart = absoluteBlockStart + openingTag.length;
    }
  }
  
  return result;
}

export default function ArticleContent({ 
  content, 
  tableOfContents, 
  internalLinkStyle = 'text',
  lang = 'ja',
  siteHost = ''
}: ArticleContentProps) {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // コンテンツ処理をメモ化して再計算を防ぐ
  const { processedContent, contentSegments } = useMemo(() => {
    // HTMLブロックを実際のHTMLコンテンツに変換
    const htmlBlockProcessed = processHtmlBlocks(content);
    
    // ショートコードを処理
    const shortcodeProcessed = ShortCodeRenderer.process(htmlBlockProcessed);
    
    // 内部リンクをブログカードプレースホルダーに変換（ブログカード形式の場合のみ）
    const [processed, urls] = processInternalLinksForBlogCard(
      shortcodeProcessed, 
      internalLinkStyle, 
      siteHost
    );
    
    // コンテンツをセグメントに分割（BlogCard用）
    const segments = splitContentByPlaceholders(processed);
    
    return { processedContent: processed, contentSegments: segments };
  }, [content, internalLinkStyle, siteHost]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Instagram埋め込みとスクリプトタグを処理するuseEffect（mountedがtrueになった後に実行）
  useEffect(() => {
    if (!mounted) return;

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
  }, [mounted, content]);

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

      // 画像を最適化（Next.js Image）
      if (domNode.name === 'img' && domNode.attribs?.src) {
        const { src, alt = '' } = domNode.attribs;
        
        // srcsetなどの不要な属性は除外し、srcとaltのみを使用
        // 外部URLの場合はそのまま表示（next.config.jsで許可が必要）
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
        const { href, ...rest } = domNode.attribs;
        
        // the-ayumi.jpへのリンクを現在のホストに変換
        let newHref = href;
        if (href.includes('the-ayumi.jp')) {
          // /2024/01/10/disability-certificate/ のような相対パスに変換
          newHref = href.replace(/https?:\/\/the-ayumi\.jp/, '');
        }
        
        // 内部記事リンクかどうかチェック
        const isInternalArticleLink = checkIsInternalArticleLink(newHref, siteHost);
        
        // ブログカード形式で表示する場合
        if (internalLinkStyle === 'blogcard' && isInternalArticleLink) {
          // 親がp要素の場合、ブロック要素として表示するために適切に処理
          return <BlogCard href={newHref} lang={lang} />;
        }
        
        // リンクの内容を抽出
        const linkText = domNode.children
          ?.map((child: any) => {
            if (typeof child === 'string') return child;
            if (child.type === 'text') return child.data;
            return '';
          })
          .join('') || '';
        
        return (
          <a href={newHref} {...rest}>
            {linkText}
          </a>
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
        
        // テキストを安全に抽出（再帰的に処理）
        const extractText = (node: any): string => {
          if (!node) return '';
          if (typeof node === 'string') return node;
          if (node.type === 'text' && typeof node.data === 'string') return node.data;
          if (node.data && typeof node.data === 'string') return node.data;
          if (Array.isArray(node.children)) {
            return node.children.map(extractText).join('');
          }
          if (node.children) {
            return extractText(node.children);
          }
          return '';
        };
        
        const textContent = domNode.children ? 
          (Array.isArray(domNode.children) ? 
            domNode.children.map(extractText).join('') : 
            extractText(domNode.children)
          ) : '';
        
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

  // SSR時はスケルトンを表示、クライアント側でのみコンテンツを表示
  if (!mounted) {
    return (
      <div className="prose prose-lg max-w-none">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // スクリプトタグや埋め込みコンテンツが含まれているかをチェック
  const hasScriptTag = /<script[\s\S]*?>[\s\S]*?<\/script>/i.test(processedContent);
  const hasGoogleMapsIframe = /<iframe[\s\S]*?src=["'][^"']*(?:maps\.google\.com|google\.com\/maps)[^"']*["'][\s\S]*?>/i.test(processedContent);
  const hasInstagramEmbed = processedContent.includes('instagram-media');
  
  // ブログカードを含むセグメントをレンダリング
  const hasBlogCards = contentSegments.some(seg => seg.type === 'blogcard');
  
  // セグメントベースのレンダリング（ブログカードがある場合）
  if (hasBlogCards && (hasScriptTag || hasGoogleMapsIframe || hasInstagramEmbed)) {
    return (
      <div ref={contentRef} className="prose prose-lg max-w-none article-content">
        {contentSegments.map((segment, index) => {
          if (segment.type === 'blogcard') {
            return <BlogCard key={`blogcard-${index}`} href={segment.content} lang={lang} />;
          }
          return (
            <div 
              key={`segment-${index}`}
              dangerouslySetInnerHTML={{ __html: segment.content }}
            />
          );
        })}
      </div>
    );
  }
  
  // スクリプトタグ、Googleマップのiframe、またはInstagram埋め込みが含まれている場合は、
  // dangerouslySetInnerHTMLで直接挿入（これにより、スクリプトが正常に動作する）
  if (hasScriptTag || hasGoogleMapsIframe || hasInstagramEmbed) {
    return (
      <div 
        ref={contentRef}
        className="prose prose-lg max-w-none article-content"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    );
  }

  // ブログカードを含むセグメントをレンダリング（スクリプトなしの場合）
  if (hasBlogCards) {
    return (
      <div ref={contentRef} className="prose prose-lg max-w-none article-content">
        {contentSegments.map((segment, index) => {
          if (segment.type === 'blogcard') {
            return <BlogCard key={`blogcard-${index}`} href={segment.content} lang={lang} />;
          }
          return <span key={`segment-${index}`}>{parse(segment.content, options)}</span>;
        })}
      </div>
    );
  }

  // スクリプトタグや埋め込みコンテンツがない場合は、通常のパース処理
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
    /* BlogCard専用スタイルリセット */
    .article-content .blogcard-wrapper {
      display: block !important;
      margin: 16px 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
    }
    .article-content .blogcard-link {
      display: flex !important;
      align-items: stretch !important;
      text-decoration: none !important;
      color: inherit !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      background: #fff !important;
      height: 150px !important;
    }
    .article-content .blogcard-link:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }
    .article-content .blogcard-thumbnail {
      width: 150px !important;
      min-width: 150px !important;
      max-width: 150px !important;
      height: 150px !important;
      min-height: 150px !important;
      max-height: 150px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      position: relative !important;
      flex-shrink: 0 !important;
      background: #f3f4f6 !important;
      align-self: stretch !important;
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
      border-radius: 0 !important;
      object-fit: cover !important;
    }
    .article-content .blogcard-content {
      flex: 1 !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 12px 16px !important;
      gap: 4px !important;
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
    .article-content .blogcard-meta::before,
    .article-content .blogcard-meta::after {
      display: none !important;
      content: none !important;
    }
    .article-content .blogcard-date {
      color: #f97316 !important;
      font-weight: 500 !important;
    }
    .article-content .blogcard-title {
      font-size: 13px !important;
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
      font-size: 11px !important;
      color: #4b5563 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      line-height: 1.5 !important;
      font-weight: normal !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
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
  type: 'html' | 'blogcard';
  content: string; // HTML content or href for blogcard
}

/**
 * コンテンツをプレースホルダーで分割
 */
function splitContentByPlaceholders(html: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const placeholderRegex = /<div class="blogcard-placeholder" data-href="([^"]+)"><\/div>/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = placeholderRegex.exec(html)) !== null) {
    // プレースホルダー前のHTML
    if (match.index > lastIndex) {
      segments.push({
        type: 'html',
        content: html.substring(lastIndex, match.index),
      });
    }
    
    // ブログカード
    segments.push({
      type: 'blogcard',
      content: decodeURIComponent(match[1]),
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // 残りのHTML
  if (lastIndex < html.length) {
    segments.push({
      type: 'html',
      content: html.substring(lastIndex),
    });
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
  // <a href="...">...</a> の形式を検索
  const linkRegex = /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>([^<]*(?:<(?!\/a>)[^<]*)*)<\/a>/gi;
  
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
      return `<div class="blogcard-placeholder" data-href="${encodeURIComponent(normalizedHref)}"></div>`;
    }
    
    return match;
  });

  return [processedHtml, internalLinkUrls];
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


