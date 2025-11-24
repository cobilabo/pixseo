'use client';

/**
 * ブロック共通の余白設定
 */

import { Block } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';

interface SpacingSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function SpacingSettings({ block, onUpdate }: SpacingSettingsProps) {
  const spacing = block.spacing || {};

  const updateSpacing = (updates: Partial<typeof spacing>) => {
    onUpdate({ 
      spacing: { 
        ...spacing, 
        ...updates 
      } 
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      {/* 上余白 */}
      <FloatingInput
        label="上余白（px）"
        type="number"
        value={spacing.paddingTop?.toString() || ''}
        onChange={(value) => {
          if (!value || value === '') {
            updateSpacing({ paddingTop: undefined });
          } else {
            const num = parseInt(value);
            updateSpacing({ paddingTop: !isNaN(num) && num >= 0 ? num : 0 });
          }
        }}
      />

      {/* 下余白 */}
      <FloatingInput
        label="下余白（px）"
        type="number"
        value={spacing.paddingBottom?.toString() || ''}
        onChange={(value) => {
          if (!value || value === '') {
            updateSpacing({ paddingBottom: undefined });
          } else {
            const num = parseInt(value);
            updateSpacing({ paddingBottom: !isNaN(num) && num >= 0 ? num : 0 });
          }
        }}
      />
    </div>
  );
}

