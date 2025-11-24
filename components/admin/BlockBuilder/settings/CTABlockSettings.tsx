'use client';

/**
 * CTAブロックの設定
 */

import { Block, CTABlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import ColorPicker from '@/components/admin/ColorPicker';
import CustomCheckbox from '@/components/admin/CustomCheckbox';

interface CTABlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function CTABlockSettings({ block, onUpdate }: CTABlockSettingsProps) {
  const config = block.config as CTABlockConfig;

  const updateConfig = (updates: Partial<CTABlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  const updateButton = (index: number, updates: Partial<CTABlockConfig['buttons'][0]>) => {
    const newButtons = [...(config.buttons || [])];
    newButtons[index] = { ...newButtons[index], ...updates };
    updateConfig({ buttons: newButtons });
  };

  const addButton = () => {
    if ((config.buttons || []).length >= 4) return;
    const newButtons = [
      ...(config.buttons || []),
      { 
        text: '', 
        url: '', 
        buttonColor: '', 
        fontSize: 'medium' as 'medium', 
        fontWeight: 'normal' as 'normal', 
        textColor: '', 
        openInNewTab: false 
      },
    ];
    updateConfig({ buttons: newButtons });
  };

  const removeButton = (index: number) => {
    const newButtons = (config.buttons || []).filter((_, i) => i !== index);
    updateConfig({ buttons: newButtons });
  };

  return (
    <div className="space-y-4">
      {/* 画像 */}
      <FeaturedImageUpload
        label="画像"
        value={config.imageUrl || ''}
        onChange={(imageUrl) => updateConfig({ imageUrl })}
        showAltInput={false}
      />

      {/* 画像alt */}
      <FloatingInput
        label="画像 alt"
        value={config.imageAlt || ''}
        onChange={(imageAlt) => updateConfig({ imageAlt })}
      />

      {/* 画像位置 */}
      <FloatingSelect
        label="画像位置"
        value={config.imagePosition || 'background'}
        onChange={(value) => updateConfig({ imagePosition: value as 'left' | 'right' | 'background' })}
        options={[
          { value: 'left', label: '左' },
          { value: 'right', label: '右' },
          { value: 'background', label: '背景' },
        ]}
      />

      {/* 画像の高さ */}
      <FloatingInput
        label="画像の高さ（px）"
        type="number"
        value={config.imageHeight?.toString() || ''}
        onChange={(value) => updateConfig({ imageHeight: value ? parseInt(value) : undefined })}
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

      {/* 説明文 */}
      <FloatingInput
        label="テキスト"
        value={config.description || ''}
        onChange={(description) => updateConfig({ description })}
        multiline
        rows={6}
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

      {/* ボタンレイアウト */}
      <FloatingSelect
        label="ボタン配置"
        value={config.buttonLayout || 'horizontal'}
        onChange={(value) => updateConfig({ buttonLayout: value as 'horizontal' | '2x2' | 'vertical' })}
        options={[
          { value: 'horizontal', label: '横並び' },
          { value: '2x2', label: '2x2配置' },
          { value: 'vertical', label: '縦並び' },
        ]}
      />

      {/* ボタン（最大4つ） */}
      {(config.buttons || []).map((button, index) => (
        <div key={index} className="space-y-3 p-4 border border-gray-200 rounded-xl">
          <FloatingInput
            label="ボタンテキスト"
            value={button.text}
            onChange={(value) => updateButton(index, { text: value })}
            required
          />

          <FloatingInput
            label="URL"
            value={button.url}
            onChange={(value) => updateButton(index, { url: value })}
            required
          />

          <ColorPicker
            label="ボタンカラー"
            value={button.buttonColor || ''}
            onChange={(value) => updateButton(index, { buttonColor: value })}
          />

          <FloatingSelect
            label="フォントサイズ"
            value={button.fontSize || 'medium'}
            onChange={(value) => updateButton(index, { fontSize: value as 'small' | 'medium' | 'large' })}
            options={[
              { value: 'small', label: '小' },
              { value: 'medium', label: '中' },
              { value: 'large', label: '大' },
            ]}
          />

          <FloatingSelect
            label="フォント太さ"
            value={button.fontWeight || 'normal'}
            onChange={(value) => updateButton(index, { fontWeight: value as 'normal' | 'bold' })}
            options={[
              { value: 'normal', label: '通常' },
              { value: 'bold', label: '太字' },
            ]}
          />

          <ColorPicker
            label="テキストカラー"
            value={button.textColor || ''}
            onChange={(value) => updateButton(index, { textColor: value })}
          />

          <CustomCheckbox
            label="新しいタブで開く"
            checked={button.openInNewTab || false}
            onChange={(checked) => updateButton(index, { openInNewTab: checked })}
          />

          <button
            type="button"
            onClick={() => removeButton(index)}
            className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            このボタンを削除
          </button>
        </div>
      ))}

      {/* ボタン追加 */}
      {(config.buttons || []).length < 4 && (
        <button
          type="button"
          onClick={addButton}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          + ボタンを追加
        </button>
      )}
    </div>
  );
}

