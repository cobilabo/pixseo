/**
 * 画像＆テキストブロックコンポーネント
 */

import Image from 'next/image';
import { Block, ImageTextBlockConfig } from '@/types/block';

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

  // 画像が背景の場合
  if (config.imagePosition === 'background') {
    return (
      <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-md" style={fullWidthStyle}>
        {config.imageUrl && (
          <Image
            src={config.imageUrl}
            alt={config.imageAlt || ''}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center text-center px-8">
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
          <p
            className={`
              ${textFontSizeClasses[config.textFontSize || 'medium']}
              ${textFontWeightClasses[config.textFontWeight || 'normal']}
              text-white max-w-2xl whitespace-pre-wrap
            `}
            style={{ color: config.textColor || 'white' }}
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
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-md">
            <Image
              src={config.imageUrl}
              alt={config.imageAlt || ''}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>
      
      {/* テキスト部分 */}
      <div className={`w-full md:w-1/2 ${isImageLeft ? 'md:text-left' : 'md:text-left'}`}>
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
        <p
          className={`
            ${textFontSizeClasses[config.textFontSize || 'medium']}
            ${textFontWeightClasses[config.textFontWeight || 'normal']}
            whitespace-pre-wrap
          `}
          style={{ color: config.textColor || undefined }}
        >
          {config.text}
        </p>
      </div>
    </div>
  );
}

