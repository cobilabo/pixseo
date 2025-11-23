/**
 * テキストブロックコンポーネント
 */

import { Block, TextBlockConfig } from '@/types/block';

interface TextBlockProps {
  block: Block;
}

export default function TextBlock({ block }: TextBlockProps) {
  const config = block.config as TextBlockConfig;
  
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };
  
  const fontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  return (
    <div
      className={`
        prose prose-lg max-w-none
        whitespace-pre-wrap
        ${alignmentClasses[config.alignment || 'left']}
        ${fontSizeClasses[config.fontSize || 'medium']}
        ${fontWeightClasses[config.fontWeight || 'normal']}
      `}
      style={{
        color: config.textColor || undefined,
        whiteSpace: 'pre-wrap',
      }}
      dangerouslySetInnerHTML={{ __html: config.content }}
    />
  );
}

