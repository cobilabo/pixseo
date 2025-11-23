'use client';

/**
 * 見出しブロックの設定
 */

import { Block, HeadingBlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';

interface HeadingBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function HeadingBlockSettings({ block, onUpdate }: HeadingBlockSettingsProps) {
  const config = block.config as HeadingBlockConfig;

  const updateConfig = (updates: Partial<HeadingBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* 見出しテキスト */}
      <FloatingInput
        label="見出しテキスト"
        value={config.content}
        onChange={(content) => updateConfig({ content })}
        required
      />

      {/* アンカーID */}
      <FloatingInput
        label="アンカーID（ページ内リンク用）"
        value={config.id || ''}
        onChange={(id) => updateConfig({ id })}
      />
    </div>
  );
}

