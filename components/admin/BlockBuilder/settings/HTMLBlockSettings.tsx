'use client';

/**
 * HTMLブロックの設定
 */

import { Block, HTMLBlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import CustomCheckbox from '@/components/admin/CustomCheckbox';

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

      <CustomCheckbox
        label="ページ下部に横幅いっぱいで表示"
        checked={config.fullWidthBottom ?? false}
        onChange={(checked) => updateConfig({ fullWidthBottom: checked })}
      />
      {config.fullWidthBottom && (
        <p className="text-xs text-gray-500 -mt-2 ml-7">
          サイドバーの有無に関わらず、ページ下部に横幅いっぱいで表示されます。
        </p>
      )}
    </div>
  );
}

