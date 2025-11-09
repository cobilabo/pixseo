'use client';

import { useEffect } from 'react';
import parse from 'html-react-parser';
import YouTubeEmbed from './YouTubeEmbed';
import ShortCodeRenderer from './ShortCodeRenderer';
import { TableOfContentsItem } from '@/types/article';

interface ArticleContentProps {
  content: string;
  tableOfContents?: TableOfContentsItem[];
}

export default function ArticleContent({ content, tableOfContents }: ArticleContentProps) {
  useEffect(() => {
    // スクロール位置を保存・復元（ページ遷移時）
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
      // YouTube埋め込みを検出して変換
      if (domNode.name === 'iframe' && domNode.attribs?.src?.includes('youtube.com')) {
        const youtubeId = extractYouTubeId(domNode.attribs.src);
        if (youtubeId) {
          return <YouTubeEmbed videoId={youtubeId} />;
        }
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

  return (
    <div className="prose prose-lg max-w-none">
      {parse(processedContent, options)}
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}


