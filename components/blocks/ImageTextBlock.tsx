/**
 * 画像＆テキストブロックコンポーネント
 */

import Image from 'next/image';
import { Block, ImageTextBlockConfig } from '@/types/block';
import { getFilterStyle } from '@/lib/utils/filter-helpers';

interface ImageTextBlockProps {
  block: Block;
  showPanel?: boolean;
}

export default function ImageTextBlock({ block, showPanel = true }: ImageTextBlockProps) {
  const config = block.config as ImageTextBlockConfig;
  
  // パネルOFFの場合は画面幅いっぱいにする
  const fullWidthStyle = !showPanel ? {
    width: '100vw',
    marginLeft: 'calc(50% - 50vw)',
    marginRight: 'calc(50% - 50vw)',
  } : {};
  
  const headingFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };
  
  const textFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  // フォントサイズをremで指定（デフォルト: 1rem）
  const headingFontSize = config.headingFontSize || 1;
  const textFontSize = config.textFontSize || 1;

  // 画像の高さスタイル
  const imageHeightStyle = config.imageHeight ? { height: `${config.imageHeight}px` } : { height: '24rem' };

  // フィルタースタイル（グラデーション対応）
  const filterStyle = getFilterStyle(
    config.filterType,
    config.filterColor,
    config.filterOpacity
  );

  // 画像が背景の場合
  if (config.imagePosition === 'background') {
    return (
      <div 
        className={`relative w-full overflow-hidden ${showPanel ? 'rounded-lg shadow-md' : ''}`}
        style={{ ...fullWidthStyle, ...imageHeightStyle }}
      >
        {config.imageUrl && (
          <>
            <Image
              src={config.imageUrl}
              alt={config.imageAlt || ''}
              fill
              className="object-cover"
            />
            {filterStyle && <div style={filterStyle} />}
          </>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8" style={{ zIndex: 2 }}>
          <h3
            className={`
              ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
              text-white mb-4 whitespace-pre-wrap
            `}
            style={{ 
              fontSize: `${headingFontSize}rem`,
              color: config.headingTextColor || 'white' 
            }}
          >
            {config.heading}
          </h3>
          <p
            className={`
              ${textFontWeightClasses[config.textFontWeight || 'normal']}
              text-white max-w-2xl whitespace-pre-wrap
            `}
            style={{ 
              fontSize: `${textFontSize}rem`,
              color: config.textColor || 'white' 
            }}
          >
            {config.text}
          </p>
        </div>
      </div>
    );
  }

  // 画像が左または右の場合（2カラムレイアウト）
  const isImageLeft = config.imagePosition === 'left';
  
  return (
    <div className={`flex flex-col md:flex-row gap-6 items-center ${isImageLeft ? '' : 'md:flex-row-reverse'}`} style={fullWidthStyle}>
      {/* 画像部分 */}
      <div className="w-full md:w-1/2">
        {config.imageUrl && (
          <div 
            className={`relative w-full overflow-hidden ${showPanel ? 'rounded-lg shadow-md' : ''}`}
            style={config.imageHeight ? { height: `${config.imageHeight}px` } : { aspectRatio: '16/9' }}
          >
            <Image
              src={config.imageUrl}
              alt={config.imageAlt || ''}
              fill
              className="object-cover"
            />
            {filterStyle && <div style={filterStyle} />}
          </div>
        )}
      </div>
      
      {/* テキスト部分 */}
      <div className={`w-full md:w-1/2 ${isImageLeft ? 'md:text-left' : 'md:text-left'}`}>
        <h3
          className={`
            ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
            mb-4 whitespace-pre-wrap
          `}
          style={{ 
            fontSize: `${headingFontSize}rem`,
            color: config.headingTextColor || undefined 
          }}
        >
          {config.heading}
        </h3>
        <p
          className={`
            ${textFontWeightClasses[config.textFontWeight || 'normal']}
            whitespace-pre-wrap
          `}
          style={{ 
            fontSize: `${textFontSize}rem`,
            color: config.textColor || undefined 
          }}
        >
          {config.text}
        </p>
      </div>
    </div>
  );
}

