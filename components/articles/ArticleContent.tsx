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
        const tocItem = tableOfContents?.[headingCount];
        const id = tocItem?.id || `heading-${headingCount}`;
        headingCount++;

        const Tag = domNode.name as 'h2' | 'h3' | 'h4';
        return (
          <Tag id={id} className="scroll-mt-20">
            {domNode.children?.map((child: any, index: number) => {
              if (typeof child === 'string' || child.data) {
                return child.data || child;
              }
              return null;
            })}
          </Tag>
        );
      }

      // 参照元のスタイリング
      if (domNode.name === 'p' && domNode.children?.[0]?.data?.includes('参照：')) {
        return (
          <p className="reference">
            {domNode.children.map((child: any, index: number) => (
              <span key={index}>{child.data || child.children}</span>
            ))}
          </p>
        );
      }
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


