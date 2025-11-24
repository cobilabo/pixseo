/**
 * CTA（Call To Action）ブロックコンポーネント
 */

import Link from 'next/link';
import Image from 'next/image';
import { Block, CTABlockConfig } from '@/types/block';

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
  
  const headingFontSizeClasses = {
    small: 'text-xl',
    medium: 'text-2xl',
    large: 'text-3xl',
  };
  
  const headingFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };
  
  const textFontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };
  
  const textFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  const buttonFontSizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  const buttonFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  // ボタンレイアウト
  const buttonLayoutClasses = {
    horizontal: 'flex flex-wrap gap-4 justify-center',
    '2x2': 'grid grid-cols-2 gap-4',
    vertical: 'flex flex-col gap-4',
  };

  // 画像の高さスタイル
  const imageHeightStyle = config.imageHeight ? { height: `${config.imageHeight}px` } : { minHeight: '24rem' };

  // フィルタースタイル
  const filterStyle = config.filterColor && config.filterOpacity ? {
    position: 'absolute' as const,
    inset: 0,
    backgroundColor: config.filterColor,
    opacity: config.filterOpacity / 100,
    pointerEvents: 'none' as const,
    zIndex: 1,
  } : undefined;

  // 画像が背景の場合
  if (config.imagePosition === 'background' && config.imageUrl) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden shadow-md" style={{ ...fullWidthStyle, ...imageHeightStyle }}>
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
                ${headingFontSizeClasses[config.headingFontSize || 'medium']}
                ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
                text-white mb-4 whitespace-pre-wrap
              `}
              style={{ color: config.headingTextColor || 'white' }}
            >
              {config.heading}
            </h3>
          )}
          {config.description && (
            <p
              className={`
                ${textFontSizeClasses[config.textFontSize || 'medium']}
                ${textFontWeightClasses[config.textFontWeight || 'normal']}
                text-white mb-6 max-w-2xl whitespace-pre-wrap
              `}
              style={{ color: config.textColor || 'white' }}
            >
              {config.description}
            </p>
          )}
          {config.buttons && config.buttons.length > 0 && (
            <div className={buttonLayoutClasses[config.buttonLayout || 'horizontal']}>
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
                      ${buttonFontSizeClasses[button.fontSize || 'medium']}
                      ${buttonFontWeightClasses[button.fontWeight || 'normal']}
                    `}
                    style={{
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
            className="relative w-full rounded-lg overflow-hidden shadow-md" 
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
                ${headingFontSizeClasses[config.headingFontSize || 'medium']}
                ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
                mb-4 whitespace-pre-wrap
              `}
              style={{ color: config.headingTextColor || undefined }}
            >
              {config.heading}
            </h3>
          )}
          {config.description && (
            <p
              className={`
                ${textFontSizeClasses[config.textFontSize || 'medium']}
                ${textFontWeightClasses[config.textFontWeight || 'normal']}
                mb-6 whitespace-pre-wrap
              `}
              style={{ color: config.textColor || undefined }}
            >
              {config.description}
            </p>
          )}
          {config.buttons && config.buttons.length > 0 && (
            <div className={buttonLayoutClasses[config.buttonLayout || 'horizontal']}>
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
                      ${buttonFontSizeClasses[button.fontSize || 'medium']}
                      ${buttonFontWeightClasses[button.fontWeight || 'normal']}
                    `}
                    style={{
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
      </div>
    );
  }

  // 画像なしの場合（テキスト＋ボタンのみ）
  return (
    <div className="text-center py-8" style={fullWidthStyle}>
      {config.heading && (
        <h3
          className={`
            ${headingFontSizeClasses[config.headingFontSize || 'medium']}
            ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
            mb-4 whitespace-pre-wrap
          `}
          style={{ color: config.headingTextColor || undefined }}
        >
          {config.heading}
        </h3>
      )}
      {config.description && (
        <p
          className={`
            ${textFontSizeClasses[config.textFontSize || 'medium']}
            ${textFontWeightClasses[config.textFontWeight || 'normal']}
            mb-6 max-w-2xl mx-auto whitespace-pre-wrap
          `}
          style={{ color: config.textColor || undefined }}
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
                  ${buttonFontSizeClasses[button.fontSize || 'medium']}
                  ${buttonFontWeightClasses[button.fontWeight || 'normal']}
                `}
                style={{
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
