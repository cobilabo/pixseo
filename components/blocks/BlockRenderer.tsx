/**
 * ブロックをレンダリングするコンポーネント
 * メインアプリ（フロントエンド）で使用
 */

import { Block } from '@/types/block';
import HeadingBlock from './HeadingBlock';
import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';
import ImageTextBlock from './ImageTextBlock';
import CTABlock from './CTABlock';
import FormBlock from './FormBlock';
import HTMLBlock from './HTMLBlock';

interface BlockRendererProps {
  blocks: Block[];
  isMobile?: boolean;
  showPanel?: boolean;
}

export default function BlockRenderer({ blocks, isMobile = false, showPanel = true }: BlockRendererProps) {
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
    <div className={showPanel ? 'space-y-6' : ''}>
      {visibleBlocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return <HeadingBlock key={block.id} block={block} />;
          case 'text':
            return <TextBlock key={block.id} block={block} />;
          case 'image':
            return <ImageBlock key={block.id} block={block} showPanel={showPanel} />;
          case 'imageText':
            return <ImageTextBlock key={block.id} block={block} showPanel={showPanel} />;
          case 'cta':
            return <CTABlock key={block.id} block={block} showPanel={showPanel} />;
          case 'form':
            return <FormBlock key={block.id} block={block} />;
          case 'html':
            return <HTMLBlock key={block.id} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
