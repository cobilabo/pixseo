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
  
  const fontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  // フォントサイズをremで指定（デフォルト: 1rem）
  const fontSize = config.fontSize || 1;

  return (
    <div
      className={`
        prose prose-lg max-w-none
        whitespace-pre-wrap
        ${alignmentClasses[config.alignment || 'left']}
        ${fontWeightClasses[config.fontWeight || 'normal']}
      `}
      style={{
        fontSize: `${fontSize}rem`,
        color: config.textColor || undefined,
        whiteSpace: 'pre-wrap',
      }}
      dangerouslySetInnerHTML={{ __html: config.content }}
    />
  );
}

