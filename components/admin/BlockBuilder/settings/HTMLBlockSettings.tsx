'use client';

/**
 * HTMLブロックの設定
 */

import { Block, HTMLBlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';

interface HTMLBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function HTMLBlockSettings({ block, onUpdate }: HTMLBlockSettingsProps) {
  const config = block.config as HTMLBlockConfig;

  const updateConfig = (updates: Partial<HTMLBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* HTML入力 */}
      <FloatingInput
        label="HTML"
        value={config.html || ''}
        onChange={(html) => updateConfig({ html })}
        multiline
        rows={12}
      />
    </div>
  );
}

