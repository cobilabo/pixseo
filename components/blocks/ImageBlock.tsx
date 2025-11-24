/**
 * 画像ブロックコンポーネント
 */

import Image from 'next/image';
import Link from 'next/link';
import { Block, ImageBlockConfig } from '@/types/block';
import { getFilterStyle } from '@/lib/utils/filter-helpers';

interface ImageBlockProps {
  block: Block;
  showPanel?: boolean;
}

export default function ImageBlock({ block, showPanel = true }: ImageBlockProps) {
  const config = block.config as ImageBlockConfig;
  
  const alignmentClasses = {
    left: 'mx-0',
    center: 'mx-auto',
    right: 'ml-auto',
  };
  
  const widthStyle = config.width ? { width: `${config.width}%` } : {};
  
  // パネルOFFの場合は画面幅いっぱいにする
  const fullWidthStyle = !showPanel ? {
    width: '100vw',
    marginLeft: 'calc(50% - 50vw)',
    marginRight: 'calc(50% - 50vw)',
  } : {};

  // 画像の高さスタイル
  const imageHeightStyle = config.imageHeight ? {
    height: `${config.imageHeight}px`,
    overflow: 'hidden',
  } : {};

  // フィルタースタイル（グラデーション対応）
  const filterStyle = getFilterStyle(
    config.filterType,
    config.filterColor,
    config.filterOpacity
  );

  const imageElement = (
    <div
      className={`relative ${showPanel ? alignmentClasses[config.alignment || 'center'] : ''}`}
      style={{ ...widthStyle, ...fullWidthStyle }}
    >
      <div 
        className={`relative overflow-hidden ${showPanel ? 'rounded-lg shadow-md' : ''}`}
        style={imageHeightStyle}
      >
        <Image
          src={config.imageUrl}
          alt={config.alt}
          width={1200}
          height={675}
          className="w-full h-full object-cover"
        />
        {filterStyle && <div style={filterStyle} />}
      </div>
      {config.caption && (
        <p className="text-sm text-gray-600 text-center mt-2">{config.caption}</p>
      )}
    </div>
  );

  // リンクがある場合はLinkでラップ
  if (config.link) {
    const isExternal = config.link.startsWith('http');
    return (
      <Link
        href={config.link}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="block hover:opacity-90 transition-opacity"
      >
        {imageElement}
      </Link>
    );
  }

  return imageElement;
}

