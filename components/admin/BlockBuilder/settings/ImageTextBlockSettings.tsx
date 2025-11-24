'use client';

/**
 * 画像&テキストブロックの設定
 */

import { Block, ImageTextBlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import ColorPicker from '@/components/admin/ColorPicker';

interface ImageTextBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function ImageTextBlockSettings({ block, onUpdate }: ImageTextBlockSettingsProps) {
  const config = block.config as ImageTextBlockConfig;

  const updateConfig = (updates: Partial<ImageTextBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* 画像 */}
      <div>
        <FeaturedImageUpload
          label="画像"
          value={config.imageUrl || ''}
          onChange={(imageUrl) => updateConfig({ imageUrl })}
          showAltInput={false}
        />
      </div>

      {/* 画像alt */}
      <FloatingInput
        label="画像altテキスト"
        value={config.imageAlt || ''}
        onChange={(imageAlt) => updateConfig({ imageAlt })}
        required
      />

      {/* 画像位置 */}
      <FloatingSelect
        label="画像位置"
        value={config.imagePosition || 'left'}
        onChange={(value) => updateConfig({ imagePosition: value as 'left' | 'right' | 'background' })}
        options={[
          { value: 'left', label: '左' },
          { value: 'right', label: '右' },
          { value: 'background', label: '背景' },
        ]}
        required
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
        onChange={(value) => updateConfig({ filterType: value as 'none' | 'full' | 'top' | 'bottom' | 'top-bottom' })}
        options={[
          { value: 'none', label: 'なし' },
          { value: 'full', label: '全面フィルタ' },
          { value: 'top', label: '上部グラデーションフィルタ' },
          { value: 'bottom', label: '下部グラデーションフィルタ' },
          { value: 'top-bottom', label: '上下グラデーションフィルタ' },
        ]}
      />

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

      {/* 見出し */}
      <FloatingInput
        label="見出し"
        value={config.heading || ''}
        onChange={(heading) => updateConfig({ heading })}
        required
      />

      {/* 見出しフォントサイズ */}
      <FloatingSelect
        label="見出しフォントサイズ"
        value={config.headingFontSize || 'medium'}
        onChange={(value) => updateConfig({ headingFontSize: value as 'small' | 'medium' | 'large' })}
        options={[
          { value: 'small', label: '小' },
          { value: 'medium', label: '中' },
          { value: 'large', label: '大' },
        ]}
      />

      {/* 見出しフォント太さ */}
      <FloatingSelect
        label="見出しフォント太さ"
        value={config.headingFontWeight || 'normal'}
        onChange={(value) => updateConfig({ headingFontWeight: value as 'normal' | 'bold' })}
        options={[
          { value: 'normal', label: '通常' },
          { value: 'bold', label: '太字' },
        ]}
      />

      {/* 見出しテキストカラー */}
      <ColorPicker
        label="見出しテキストカラー"
        value={config.headingTextColor || ''}
        onChange={(headingTextColor) => updateConfig({ headingTextColor })}
      />

      {/* テキスト */}
      <FloatingInput
        label="テキスト"
        value={config.text || ''}
        onChange={(text) => updateConfig({ text })}
        multiline
        rows={8}
      />

      {/* テキストフォントサイズ */}
      <FloatingSelect
        label="テキストフォントサイズ"
        value={config.textFontSize || 'medium'}
        onChange={(value) => updateConfig({ textFontSize: value as 'small' | 'medium' | 'large' })}
        options={[
          { value: 'small', label: '小' },
          { value: 'medium', label: '中' },
          { value: 'large', label: '大' },
        ]}
      />

      {/* テキストフォント太さ */}
      <FloatingSelect
        label="テキストフォント太さ"
        value={config.textFontWeight || 'normal'}
        onChange={(value) => updateConfig({ textFontWeight: value as 'normal' | 'bold' })}
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

