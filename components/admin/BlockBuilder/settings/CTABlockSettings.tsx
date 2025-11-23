'use client';

/**
 * CTAブロックの設定
 */

import { Block, CTABlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import ColorPicker from '@/components/admin/ColorPicker';

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
        <div key={index} className="space-y-2 p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">ボタン {index + 1}</h4>
            {index > 0 && (
              <button
                type="button"
                onClick={() => removeButton(index)}
                className="text-red-600 hover:text-red-700 text-xs"
              >
                削除
              </button>
            )}
          </div>

          <FloatingInput
            label={`ボタンテキスト ${index + 1}`}
            value={button.text}
            onChange={(value) => updateButton(index, { text: value })}
            required
          />

          <FloatingInput
            label={`URL ${index + 1}`}
            value={button.url}
            onChange={(value) => updateButton(index, { url: value })}
            required
          />

          <ColorPicker
            label={`ボタンカラー ${index + 1}`}
            value={button.buttonColor || ''}
            onChange={(value) => updateButton(index, { buttonColor: value })}
          />

          <FloatingSelect
            label={`フォントサイズ ${index + 1}`}
            value={button.fontSize || 'medium'}
            onChange={(value) => updateButton(index, { fontSize: value as 'small' | 'medium' | 'large' })}
            options={[
              { value: 'small', label: '小' },
              { value: 'medium', label: '中' },
              { value: 'large', label: '大' },
            ]}
          />

          <FloatingSelect
            label={`フォント太さ ${index + 1}`}
            value={button.fontWeight || 'normal'}
            onChange={(value) => updateButton(index, { fontWeight: value as 'normal' | 'bold' })}
            options={[
              { value: 'normal', label: '通常' },
              { value: 'bold', label: '太字' },
            ]}
          />

          <ColorPicker
            label={`テキストカラー ${index + 1}`}
            value={button.textColor || ''}
            onChange={(value) => updateButton(index, { textColor: value })}
          />

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              新しいタブで開く
            </label>
            <button
              type="button"
              onClick={() => updateButton(index, { openInNewTab: !button.openInNewTab })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                button.openInNewTab ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  button.openInNewTab ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
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

