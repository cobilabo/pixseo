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
  
  const fontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  // IDがある場合はページ内リンク用のID属性を追加
  const headingId = config.id || undefined;
  
  // フォントサイズをremで指定（デフォルト: 1rem）
  const fontSize = config.fontSize || 1;

  return (
    <h2
      id={headingId}
      className={`
        ${alignmentClasses[config.alignment || 'left']}
        ${fontWeightClasses[config.fontWeight || 'bold']}
        mb-4
      `}
      style={{
        fontSize: `${fontSize}rem`,
        color: config.textColor || undefined,
      }}
    >
      {config.content}
    </h2>
  );
}

