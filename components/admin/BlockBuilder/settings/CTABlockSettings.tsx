'use client';

/**
 * CTAブロックの設定
 */

import { Block, CTABlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';

interface CTABlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function CTABlockSettings({ block, onUpdate }: CTABlockSettingsProps) {
  const config = block.config as CTABlockConfig;

  const updateConfig = (updates: Partial<CTABlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* ボタンテキスト */}
      <FloatingInput
        label="ボタンテキスト"
        value={config.text}
        onChange={(value) => updateConfig({ text: value })}
        required
      />

      {/* URL */}
      <FloatingInput
        label="リンク先"
        value={config.url}
        onChange={(value) => updateConfig({ url: value })}
        required
      />

      {/* スタイル */}
      <FloatingSelect
        label="スタイル"
        value={config.style || 'primary'}
        onChange={(value) => updateConfig({ style: value as 'primary' | 'secondary' | 'outline' })}
        options={[
          { value: 'primary', label: 'プライマリ（青）' },
          { value: 'secondary', label: 'セカンダリ（グレー）' },
          { value: 'outline', label: 'アウトライン' },
        ]}
      />

      {/* サイズ */}
      <FloatingSelect
        label="サイズ"
        value={config.size || 'medium'}
        onChange={(value) => updateConfig({ size: value as 'small' | 'medium' | 'large' })}
        options={[
          { value: 'small', label: '小' },
          { value: 'medium', label: '中' },
          { value: 'large', label: '大' },
        ]}
      />

      {/* 配置 */}
      <FloatingSelect
        label="配置"
        value={config.alignment || 'center'}
        onChange={(value) => updateConfig({ alignment: value as 'left' | 'center' | 'right' })}
        options={[
          { value: 'left', label: '左揃え' },
          { value: 'center', label: '中央揃え' },
          { value: 'right', label: '右揃え' },
        ]}
      />

      {/* 新しいタブで開く */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          新しいタブで開く
        </label>
        <button
          type="button"
          onClick={() => updateConfig({ openInNewTab: !config.openInNewTab })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.openInNewTab ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.openInNewTab ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

