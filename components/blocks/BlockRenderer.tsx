/**
 * ブロックをレンダリングするコンポーネント
 * メインアプリ（フロントエンド）で使用
 */

import { Block, SliderBlockConfig, HTMLBlockConfig } from '@/types/block';
import { Lang } from '@/types/lang';
import FormBlock from './FormBlock';
import HTMLBlock from './HTMLBlock';
import SpacerBlock from './SpacerBlock';
import ContentBlock from './ContentBlock';
import ArticleBlock from './ArticleBlock';
import SliderBlock from './SliderBlock';
import RowBlock from './RowBlock';
import SearchBlock from './SearchBlock';
import CustomBlock from './CustomBlock';

interface BlockRendererProps {
  blocks: Block[];
  isMobile?: boolean;
  showPanel?: boolean;
  lang?: Lang;
  layoutTheme?: string;
  excludeFullWidthSliders?: boolean;
  excludeFullWidthBottomBlocks?: boolean;
  searchData?: {
    tags?: Array<{ id: string; name: string; slug: string }>;
    categories?: Array<{ id: string; name: string; slug: string; isHiddenFromLists?: boolean }>;
    popularTags?: Array<{ value: string; displayName?: string; count: number }>;
    mediaId?: string;
  };
}

export function hasFullWidthSlider(blocks: Block[]): boolean {
  return blocks.some(
    block => block.type === 'slider' && (block.config as SliderBlockConfig).fullWidthTop
  );
}

export function getFullWidthSliderBlocks(blocks: Block[]): Block[] {
  return blocks
    .filter(block => block.type === 'slider' && (block.config as SliderBlockConfig).fullWidthTop)
    .sort((a, b) => a.order - b.order);
}

export function hasFullWidthBottomBlocks(blocks: Block[]): boolean {
  return blocks.some(
    block => block.type === 'html' && (block.config as HTMLBlockConfig).fullWidthBottom
  );
}

export function getFullWidthBottomBlocks(blocks: Block[]): Block[] {
  return blocks
    .filter(block => block.type === 'html' && (block.config as HTMLBlockConfig).fullWidthBottom)
    .sort((a, b) => a.order - b.order);
}

export default function BlockRenderer({ blocks, isMobile = false, showPanel = true, lang = 'ja' as Lang, layoutTheme, excludeFullWidthSliders = false, excludeFullWidthBottomBlocks = false, searchData }: BlockRendererProps) {
  const visibleBlocks = blocks
    .filter(block => {
      if (isMobile && block.showOnMobile === false) return false;
      if (!isMobile && block.showOnDesktop === false) return false;
      if (excludeFullWidthSliders && block.type === 'slider' && (block.config as SliderBlockConfig).fullWidthTop) return false;
      if (excludeFullWidthBottomBlocks && block.type === 'html' && (block.config as HTMLBlockConfig).fullWidthBottom) return false;
      return true;
    })
    .sort((a, b) => {
      if (isMobile && a.mobileOrder !== undefined && b.mobileOrder !== undefined) {
        return a.mobileOrder - b.mobileOrder;
      }
      return a.order - b.order;
    });

  return (
    <div>
      {visibleBlocks.map((block) => {
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
            blockContent = <FormBlock block={block} lang={lang} layoutTheme={layoutTheme} />;
            break;
          case 'html':
            blockContent = <HTMLBlock block={block} lang={lang} />;
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
          case 'slider':
            blockContent = <SliderBlock block={block} lang={lang} />;
            break;
          case 'row':
            blockContent = <RowBlock block={block} lang={lang} layoutTheme={layoutTheme} />;
            break;
          case 'search':
            blockContent = (
              <SearchBlock
                block={block}
                lang={lang}
                tags={searchData?.tags}
                categories={searchData?.categories}
                popularTags={searchData?.popularTags}
                mediaId={searchData?.mediaId}
              />
            );
            break;
          case 'custom':
            blockContent = <CustomBlock config={block.config as any} showPanel={showPanel} lang={lang} />;
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
