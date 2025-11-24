/**
 * 空白ブロックコンポーネント
 */

import { Block, SpacerBlockConfig } from '@/types/block';

interface SpacerBlockProps {
  block: Block;
}

export default function SpacerBlock({ block }: SpacerBlockProps) {
  const config = block.config as SpacerBlockConfig;
  const height = config.height || 40;

  return (
    <div 
      style={{ height: `${height}px` }}
      className="w-full"
      aria-hidden="true"
    />
  );
}

