'use client';

/**
 * 画像ブロックの設定
 */

import { Block, ImageBlockConfig } from '@/types/block';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import ColorPicker from '@/components/admin/ColorPicker';

interface ImageBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function ImageBlockSettings({ block, onUpdate }: ImageBlockSettingsProps) {
  const config = block.config as ImageBlockConfig;

  const updateConfig = (updates: Partial<ImageBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* 画像アップロード */}
      <FeaturedImageUpload
        label="画像"
        value={config.imageUrl || ''}
        alt={config.alt || ''}
        onChange={(url) => updateConfig({ imageUrl: url })}
        onAltChange={(alt) => updateConfig({ alt })}
      />

      {/* リンク先 */}
      <FloatingInput
        label="リンク先"
        value={config.link || ''}
        onChange={(value) => updateConfig({ link: value })}
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

      {/* 画像の高さ */}
      <FloatingInput
        label="画像の高さ（px）※ 空欄でアスペクト比 100％"
        type="number"
        value={config.imageHeight?.toString() || ''}
        onChange={(value) => {
          if (!value || value === '') {
            updateConfig({ imageHeight: undefined });
          } else {
            const num = parseInt(value);
            updateConfig({ imageHeight: !isNaN(num) ? num : undefined });
          }
        }}
      />

      {/* フィルタータイプ */}
      <FloatingSelect
        label="フィルタータイプ"
        value={config.filterType || 'none'}
        onChange={(value) => updateConfig({ filterType: value as 'none' | 'full' | 'top' | 'bottom' | 'top-bottom' | 'all-direction' })}
        options={[
          { value: 'none', label: 'なし' },
          { value: 'full', label: '全面フィルタ' },
          { value: 'top', label: '上部グラデーションフィルタ' },
          { value: 'bottom', label: '下部グラデーションフィルタ' },
          { value: 'top-bottom', label: '上下グラデーションフィルタ' },
          { value: 'all-direction', label: '全方位グラデーションフィルタ' },
        ]}
      />

      {/* フィルターカラーとフィルター透明度（フィルタータイプが「なし」以外の場合のみ表示） */}
      {config.filterType && config.filterType !== 'none' && (
        <>
          {/* フィルターカラー */}
          <ColorPicker
            label="フィルターカラー"
            value={config.filterColor || ''}
            onChange={(value) => updateConfig({ filterColor: value })}
          />

          {/* フィルター透明度 */}
          <FloatingInput
            label="フィルター透明度（0-100）"
            type="number"
            value={config.filterOpacity?.toString() || ''}
            onChange={(value) => {
              const num = parseInt(value);
              updateConfig({ filterOpacity: value && !isNaN(num) ? Math.min(100, Math.max(0, num)) : undefined });
            }}
          />
        </>
      )}
    </div>
  );
}

