/**
 * CTA（Call To Action）ブロックコンポーネント
 */

import Link from 'next/link';
import Image from 'next/image';
import { Block, CTABlockConfig, CTAButtonConfig } from '@/types/block';
import { getFilterStyle } from '@/lib/utils/filter-helpers';

interface CTABlockProps {
  block: Block;
  showPanel?: boolean;
}

export default function CTABlock({ block, showPanel = true }: CTABlockProps) {
  const config = block.config as CTABlockConfig;
  
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

  const buttonFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  // フォントサイズをremで指定（デフォルト: 1rem）
  const headingFontSize = config.headingFontSize || 1;
  const textFontSize = config.textFontSize || 1;

  // ボタンレイアウト
  const buttonLayoutClasses = {
    horizontal: 'flex flex-wrap gap-4 justify-center',
    '2x2': 'grid grid-cols-2 gap-4',
    vertical: 'flex flex-col gap-4',
  };

  // 画像の高さスタイル
  const imageHeightStyle = config.imageHeight ? { height: `${config.imageHeight}px` } : { minHeight: '24rem' };

  // フィルタースタイル（グラデーション対応）
  const filterStyle = getFilterStyle(
    config.filterType,
    config.filterColor,
    config.filterOpacity
  );

  // ボタンレンダリング関数
  const renderButton = (button: CTAButtonConfig, index: number) => {
    const isExternal = button.url?.startsWith('http');
    
    // テキストボタン
    if (button.type === 'text') {
      return (
        <Link
          key={index}
          href={button.url || '#'}
          target={button.openInNewTab || isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className={`
            inline-block
            rounded-lg
            transition-all
            hover:scale-105
            shadow-md
            px-6 py-3
            ${buttonFontWeightClasses[button.fontWeight || 'normal']}
          `}
          style={{
            fontSize: `${button.fontSize || 1}rem`,
            backgroundColor: button.buttonColor || '#3b82f6',
            color: button.textColor || '#ffffff',
          }}
        >
          {button.text}
        </Link>
      );
    }
    
    // 画像ボタン
    if (button.type === 'image' && button.imageUrl) {
      return (
        <Link
          key={index}
          href={button.url || '#'}
          target={button.openInNewTab || isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="inline-block transition-all hover:scale-105"
        >
          <Image
            src={button.imageUrl}
            alt={button.imageAlt || 'ボタン画像'}
            width={200}
            height={60}
            className="object-contain"
          />
        </Link>
      );
    }
    
    return null;
  };

  // 画像が背景の場合
  if (config.imagePosition === 'background' && config.imageUrl) {
    return (
      <div 
        className={`relative w-full overflow-hidden ${showPanel ? 'rounded-lg shadow-md' : ''}`}
        style={{ ...fullWidthStyle, ...imageHeightStyle }}
      >
        <Image
          src={config.imageUrl}
          alt={config.imageAlt || ''}
          fill
          className="object-cover"
        />
        {filterStyle && <div style={filterStyle} />}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 py-12" style={{ zIndex: 2 }}>
          {config.heading && (
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
          )}
          {config.description && (
            <p
              className={`
                ${textFontWeightClasses[config.textFontWeight || 'normal']}
                text-white mb-6 max-w-2xl whitespace-pre-wrap
              `}
              style={{ 
                fontSize: `${textFontSize}rem`,
                color: config.textColor || 'white' 
              }}
            >
              {config.description}
            </p>
          )}
          {config.buttons && config.buttons.length > 0 && (
            <div className={buttonLayoutClasses[config.buttonLayout || 'horizontal']}>
              {config.buttons.map(renderButton)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 画像が左または右の場合（2カラムレイアウト）
  const isImageLeft = config.imagePosition === 'left';
  
  if (config.imageUrl && (config.imagePosition === 'left' || config.imagePosition === 'right')) {
    return (
      <div className={`flex flex-col md:flex-row gap-6 items-center ${isImageLeft ? '' : 'md:flex-row-reverse'}`} style={fullWidthStyle}>
        {/* 画像部分 */}
        <div className="w-full md:w-1/2">
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
        </div>
        
        {/* テキスト＋CTAボタン部分 */}
        <div className={`w-full md:w-1/2 ${isImageLeft ? 'md:text-left' : 'md:text-left'}`}>
          {config.heading && (
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
          )}
          {config.description && (
            <p
              className={`
                ${textFontWeightClasses[config.textFontWeight || 'normal']}
                mb-6 whitespace-pre-wrap
              `}
              style={{ 
            fontSize: `${textFontSize}rem`,
            color: config.textColor || undefined 
          }}
            >
              {config.description}
            </p>
          )}
          {config.buttons && config.buttons.length > 0 && (
            <div className={buttonLayoutClasses[config.buttonLayout || 'horizontal']}>
              {config.buttons.map(renderButton)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 画像なしの場合（テキスト＋ボタンのみ）
  return (
    <div className="text-center py-8" style={fullWidthStyle}>
      {config.heading && (
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
      )}
      {config.description && (
        <p
          className={`
            ${textFontWeightClasses[config.textFontWeight || 'normal']}
            mb-6 max-w-2xl mx-auto whitespace-pre-wrap
          `}
          style={{ 
            fontSize: `${textFontSize}rem`,
            color: config.textColor || undefined 
          }}
        >
          {config.description}
        </p>
      )}
      {config.buttons && config.buttons.length > 0 && (
        <div className={`${buttonLayoutClasses[config.buttonLayout || 'horizontal']} max-w-2xl mx-auto`}>
          {config.buttons.map((button, index) => {
            const isExternal = button.url.startsWith('http');
            return (
              <Link
                key={index}
                href={button.url}
                target={button.openInNewTab || isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className={`
                  inline-block
                  rounded-lg
                  transition-all
                  hover:scale-105
                  shadow-md
                  px-6 py-3
                  ${buttonFontWeightClasses[button.fontWeight || 'normal']}
                `}
                style={{
                  fontSize: `${button.fontSize || 1}rem`,
                  backgroundColor: button.buttonColor || '#3b82f6',
                  color: button.textColor || '#ffffff',
                }}
              >
                {button.text}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
