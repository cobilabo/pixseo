/**
 * ブロックをレンダリングするコンポーネント
 * メインアプリ（フロントエンド）で使用
 */

import { Block, SliderBlockConfig, HTMLBlockConfig, CustomBlockConfig } from '@/types/block';
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
import type { RecaptchaPublicConfig } from '@/lib/recaptcha';

interface BlockRendererProps {
  blocks: Block[];
  isMobile?: boolean;
  showPanel?: boolean;
  lang?: Lang;
  layoutTheme?: string;
  recaptchaConfig?: RecaptchaPublicConfig;
  excludeFullWidthSliders?: boolean;
  excludeFullWidthBottomBlocks?: boolean;
  /** blank レイアウト: header/footer カスタムブロック以外を <main> でラップ */
  semanticLandmarks?: boolean;
  searchData?: {
    tags?: Array<{ id: string; name: string; slug: string }>;
    categories?: Array<{ id: string; name: string; slug: string; isHiddenFromLists?: boolean }>;
    featuredTags?: Array<{ id: string; name: string; slug: string }>;
    popularTags?: Array<{ value: string; displayName?: string; count: number }>;
    popularKeywords?: Array<{ value: string; displayName?: string; count: number }>;
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

const HEADER_BLOCK_IDS = new Set(['95hbSjU9PkvJZIYgbWjr']);
const FOOTER_BLOCK_IDS = new Set(['ku2QvTERFVD2eQNKuirz']);

function isHeaderFooterBlock(block: Block): 'header' | 'footer' | null {
  if (block.type !== 'custom') return null;
  const config = block.config as CustomBlockConfig;
  const name = (config.customBlockName || '').toLowerCase();
  if (name === 'header' || HEADER_BLOCK_IDS.has(config.customBlockId)) return 'header';
  if (name === 'footer' || FOOTER_BLOCK_IDS.has(config.customBlockId)) return 'footer';
  return null;
}

export default function BlockRenderer({ blocks, isMobile = false, showPanel = true, lang = 'ja' as Lang, layoutTheme, recaptchaConfig, excludeFullWidthSliders = false, excludeFullWidthBottomBlocks = false, semanticLandmarks = false, searchData }: BlockRendererProps) {
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

  const renderBlock = (block: Block) => {
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
        blockContent = <FormBlock block={block} lang={lang} layoutTheme={layoutTheme} recaptchaConfig={recaptchaConfig} />;
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
        blockContent = <RowBlock block={block} lang={lang} layoutTheme={layoutTheme} recaptchaConfig={recaptchaConfig} />;
        break;
      case 'search':
        blockContent = (
          <SearchBlock
            block={block}
            lang={lang}
            tags={searchData?.tags}
            categories={searchData?.categories}
            featuredTags={searchData?.featuredTags}
            popularTags={searchData?.popularTags}
            popularKeywords={searchData?.popularKeywords}
            mediaId={searchData?.mediaId}
          />
        );
        break;
      case 'custom':
        blockContent = <CustomBlock config={block.config as CustomBlockConfig} showPanel={showPanel} lang={lang} />;
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
  };

  if (!semanticLandmarks) {
    return <div>{visibleBlocks.map(renderBlock)}</div>;
  }

  const headerBlocks: Block[] = [];
  const footerBlocks: Block[] = [];
  const mainBlocks: Block[] = [];

  for (const block of visibleBlocks) {
    const role = isHeaderFooterBlock(block);
    if (role === 'header') headerBlocks.push(block);
    else if (role === 'footer') footerBlocks.push(block);
    else mainBlocks.push(block);
  }

  return (
    <div>
      {headerBlocks.map(renderBlock)}
      {mainBlocks.length > 0 ? (
        <main id="main-content">{mainBlocks.map(renderBlock)}</main>
      ) : null}
      {footerBlocks.map(renderBlock)}
    </div>
  );
}
