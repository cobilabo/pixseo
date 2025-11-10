'use client';

import { useEffect, useState } from 'react';
import parse, { DOMNode, Element } from 'html-react-parser';
import Image from 'next/image';
import YouTubeEmbed from './YouTubeEmbed';
import ShortCodeRenderer from './ShortCodeRenderer';
import { TableOfContentsItem } from '@/types/article';

interface ArticleContentProps {
  content: string;
  tableOfContents?: TableOfContentsItem[];
}

export default function ArticleContent({ content, tableOfContents }: ArticleContentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Instagram埋め込みのscriptを再読み込み
    if (typeof window !== 'undefined' && (window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
    }
    
    return () => {
      // クリーンアップ
    };
  }, []);

  // ショートコードを処理
  const processedContent = ShortCodeRenderer.process(content);

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
        const { src, alt = '', ...rest } = domNode.attribs;
        
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
              {...rest}
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

  return (
    <div className="prose prose-lg max-w-none" suppressHydrationWarning>
      {parse(processedContent, options)}
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}


