'use client';

/**
 * テキストブロックの設定
 */

import { Block, TextBlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import ColorPicker from '@/components/admin/ColorPicker';

interface TextBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function TextBlockSettings({ block, onUpdate }: TextBlockSettingsProps) {
  const config = block.config as TextBlockConfig;

  const updateConfig = (updates: Partial<TextBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* テキスト入力 */}
      <FloatingInput
        label="テキスト"
        value={config.content || ''}
        onChange={(content) => updateConfig({ content })}
        multiline
        rows={12}
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
      <FloatingSelect
        label="フォントサイズ"
        value={config.fontSize || 'medium'}
        onChange={(value) => updateConfig({ fontSize: value as 'small' | 'medium' | 'large' })}
        options={[
          { value: 'small', label: '小' },
          { value: 'medium', label: '中' },
          { value: 'large', label: '大' },
        ]}
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

