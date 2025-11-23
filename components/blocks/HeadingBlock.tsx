/**
 * 見出しブロックコンポーネント
 */

import { Block, HeadingBlockConfig } from '@/types/block';

interface HeadingBlockProps {
  block: Block;
}

export default function HeadingBlock({ block }: HeadingBlockProps) {
  const config = block.config as HeadingBlockConfig;
  
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  const fontSizeClasses = {
    small: 'text-xl',
    medium: 'text-2xl',
    large: 'text-3xl',
  };
  
  const fontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  // IDがある場合はページ内リンク用のID属性を追加
  const headingId = config.id || undefined;

  return (
    <h2
      id={headingId}
      className={`
        ${alignmentClasses[config.alignment || 'left']}
        ${fontSizeClasses[config.fontSize || 'medium']}
        ${fontWeightClasses[config.fontWeight || 'bold']}
        mb-4
      `}
      style={{
        color: config.textColor || undefined,
      }}
    >
      {config.content}
    </h2>
  );
}

