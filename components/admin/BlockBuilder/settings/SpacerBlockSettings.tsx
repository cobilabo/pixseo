'use client';

/**
 * 空白ブロックの設定
 */

import { Block, SpacerBlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';

interface SpacerBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function SpacerBlockSettings({ block, onUpdate }: SpacerBlockSettingsProps) {
  const config = block.config as SpacerBlockConfig;

  const updateConfig = (updates: Partial<SpacerBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* 高さ */}
      <FloatingInput
        label="高さ（px）"
        type="number"
        value={config.height?.toString() || ''}
        onChange={(value) => {
          const num = parseInt(value);
          updateConfig({ height: !isNaN(num) && num > 0 ? num : 40 });
        }}
        required
      />
    </div>
  );
}

