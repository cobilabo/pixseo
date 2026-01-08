/**
 * ブロックをレンダリングするコンポーネント
 * メインアプリ（フロントエンド）で使用
 */

import { Block } from '@/types/block';
import { Lang } from '@/types/lang';
import FormBlock from './FormBlock';
import HTMLBlock from './HTMLBlock';
import SpacerBlock from './SpacerBlock';
import ContentBlock from './ContentBlock';
import ArticleBlock from './ArticleBlock';

interface BlockRendererProps {
  blocks: Block[];
  isMobile?: boolean;
  showPanel?: boolean;
  lang?: Lang;
}

export default function BlockRenderer({ blocks, isMobile = false, showPanel = true, lang = 'ja' as Lang }: BlockRendererProps) {
  // 表示するブロックをフィルタリング
  const visibleBlocks = blocks
    .filter(block => {
      if (isMobile && block.showOnMobile === false) return false;
      if (!isMobile && block.showOnDesktop === false) return false;
      return true;
    })
    .sort((a, b) => {
      // モバイル時は mobileOrder を優先
      if (isMobile && a.mobileOrder !== undefined && b.mobileOrder !== undefined) {
        return a.mobileOrder - b.mobileOrder;
      }
      return a.order - b.order;
    });

  return (
    <div className="space-y-6">
      {visibleBlocks.map((block) => {
        // padding設定を適用
        const paddingStyle: React.CSSProperties = {};
        if (block.spacing?.paddingTop !== undefined) {
          paddingStyle.paddingTop = `${block.spacing.paddingTop}px`;
        }
        if (block.spacing?.paddingBottom !== undefined) {
          paddingStyle.paddingBottom = `${block.spacing.paddingBottom}px`;
        }

        let blockContent;
        switch (block.type) {
          case 'form':
            blockContent = <FormBlock block={block} />;
            break;
          case 'html':
            blockContent = <HTMLBlock block={block} />;
            break;
          case 'spacer':
            blockContent = <SpacerBlock block={block} />;
            break;
          case 'content':
            blockContent = <ContentBlock block={block} showPanel={showPanel} isMobile={isMobile} lang={lang} />;
            break;
          case 'article':
            blockContent = <ArticleBlock block={block} lang={lang} />;
            break;
          default:
            blockContent = null;
        }

        if (!blockContent) return null;

        return (
          <div key={block.id} style={paddingStyle}>
            {blockContent}
          </div>
        );
      })}
    </div>
  );
}
