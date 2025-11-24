'use client';

/**
 * 見出しブロックの設定
 */

import { Block, HeadingBlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import ColorPicker from '@/components/admin/ColorPicker';

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
        value={config.content || ''}
        onChange={(content) => updateConfig({ content })}
        required
      />

      {/* アンカーID */}
      <FloatingInput
        label="アンカーID（ページ内リンク用）"
        value={config.id || ''}
        onChange={(id) => updateConfig({ id })}
      />

      {/* 配置 */}
      <FloatingSelect
        label="配置"
        value={config.alignment || 'left'}
        onChange={(value) => updateConfig({ alignment: value as 'left' | 'center' | 'right' })}
        options={[
          { value: 'left', label: '左揃え' },
          { value: 'center', label: '中央揃え' },
          { value: 'right', label: '右揃え' },
        ]}
      />

      {/* フォントサイズ */}
      <FloatingInput
        label="フォントサイズ（rem）"
        type="number"
        step="0.1"
        value={config.fontSize?.toString() || ''}
        onChange={(value) => {
          if (!value || value === '') {
            updateConfig({ fontSize: 1 });
          } else {
            const num = parseFloat(value);
            updateConfig({ fontSize: !isNaN(num) && num > 0 ? num : 1 });
          }
        }}
      />

      {/* フォント太さ */}
      <FloatingSelect
        label="フォント太さ"
        value={config.fontWeight || 'normal'}
        onChange={(value) => updateConfig({ fontWeight: value as 'normal' | 'bold' })}
        options={[
          { value: 'normal', label: '通常' },
          { value: 'bold', label: '太字' },
        ]}
      />

      {/* テキストカラー */}
      <ColorPicker
        label="テキストカラー"
        value={config.textColor || ''}
        onChange={(textColor) => updateConfig({ textColor })}
      />
    </div>
  );
}

