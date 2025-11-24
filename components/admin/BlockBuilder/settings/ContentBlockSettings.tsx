'use client';

/**
 * コンテンツブロックの設定
 */

import { useState, useEffect } from 'react';
import { Block, ContentBlockConfig, CTAButtonConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import ColorPicker from '@/components/admin/ColorPicker';
import CustomCheckbox from '@/components/admin/CustomCheckbox';

interface Writer {
  id: string;
  handleName: string;
}

interface ContentBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function ContentBlockSettings({ block, onUpdate }: ContentBlockSettingsProps) {
  const config = block.config as ContentBlockConfig;
  const [availableWriters, setAvailableWriters] = useState<Writer[]>([]);

  // ライター一覧を取得
  useEffect(() => {
    const fetchWriters = async () => {
      try {
        const currentTenantId = typeof window !== 'undefined' 
          ? localStorage.getItem('currentTenantId') 
          : null;
        
        const response = await fetch('/api/admin/writers', {
          headers: {
            'x-media-id': currentTenantId || '',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch writers');
        }
        
        const data = await response.json();
        setAvailableWriters(data);
        console.log('[ContentBlockSettings] Fetched writers:', data);
      } catch (error) {
        console.error('Error fetching writers:', error);
      }
    };

    fetchWriters();
  }, []);

  const updateConfig = (updates: Partial<ContentBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  const updateButton = (index: number, updates: Partial<CTAButtonConfig>) => {
    const newButtons = [...(config.buttons || [])];
    const currentButton = newButtons[index];
    
    // undefinedの値は削除し、それ以外は更新
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) {
        delete (currentButton as any)[key];
      } else {
        (currentButton as any)[key] = value;
      }
    });
    
    updateConfig({ buttons: newButtons });
  };

  const addButton = () => {
    if ((config.buttons || []).length >= 4) return;
    const newButtons = [
      ...(config.buttons || []),
      { 
        type: 'text' as 'text',
        text: '', 
        url: '', 
        buttonColor: '', 
        fontSize: 1, 
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
      {/* セクションID */}
      <FloatingInput
        label="セクションID（ページ内リンク用）"
        value={config.sectionId || ''}
        onChange={(value) => updateConfig({ sectionId: value })}
      />

      {/* 画像セクション */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => updateConfig({ showImage: !config.showImage })}
          className={`w-full py-3 px-4 rounded-full text-sm font-medium transition-colors ${
            config.showImage
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {config.showImage ? '画像を使用（押下でOFF）' : '画像を使用する'}
        </button>

        {config.showImage && (
          <div className="space-y-4">
            <FeaturedImageUpload
              label="画像"
              value={config.imageUrl || ''}
              onChange={(imageUrl) => updateConfig({ imageUrl })}
              showAltInput={false}
            />

            <FloatingInput
              label="画像alt属性"
              value={config.imageAlt || ''}
              onChange={(imageAlt) => updateConfig({ imageAlt })}
            />

            <FloatingSelect
              label="画像位置"
              value={config.imagePosition || 'background'}
              onChange={(value) => updateConfig({ imagePosition: value as 'left' | 'right' | 'background' | 'center-size-based' })}
              options={[
                { value: 'left', label: '左' },
                { value: 'right', label: '右' },
                { value: 'background', label: '背景' },
                { value: 'center-size-based', label: 'サイズを指定して中央配置' },
              ]}
            />

            {/* 左・右・背景の場合は高さを設定 */}
            {config.imagePosition !== 'center-size-based' && (
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
            )}

            {/* サイズを指定して中央配置の場合 */}
            {config.imagePosition === 'center-size-based' && (
              <>
                <FloatingInput
                  label="画像の幅（px）※ 高さと排他"
                  type="number"
                  value={config.imageWidth?.toString() || ''}
                  onChange={(value) => {
                    if (!value || value === '') {
                      updateConfig({ imageWidth: undefined });
                    } else {
                      const num = parseInt(value);
                      updateConfig({ imageWidth: !isNaN(num) ? num : undefined, imageHeight: undefined });
                    }
                  }}
                />

                <FloatingInput
                  label="画像の高さ（px）※ 幅と排他"
                  type="number"
                  value={config.imageHeight?.toString() || ''}
                  onChange={(value) => {
                    if (!value || value === '') {
                      updateConfig({ imageHeight: undefined });
                    } else {
                      const num = parseInt(value);
                      updateConfig({ imageHeight: !isNaN(num) ? num : undefined, imageWidth: undefined });
                    }
                  }}
                />
              </>
            )}

            <FloatingSelect
              label="フィルタータイプ"
              value={config.filterType || 'none'}
              onChange={(value) => updateConfig({ filterType: value as any })}
              options={[
                { value: 'none', label: 'なし' },
                { value: 'full', label: '全面フィルタ' },
                { value: 'top', label: '上部グラデーション' },
                { value: 'bottom', label: '下部グラデーション' },
                { value: 'top-bottom', label: '上下グラデーション' },
                { value: 'all-direction', label: '全方位グラデーション' },
              ]}
            />

            {config.filterType && config.filterType !== 'none' && (
              <>
                <ColorPicker
                  label="フィルターカラー"
                  value={config.filterColor || ''}
                  onChange={(value) => updateConfig({ filterColor: value })}
                />

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
        )}
      </div>

      {/* 見出しセクション */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => updateConfig({ showHeading: !config.showHeading })}
          className={`w-full py-3 px-4 rounded-full text-sm font-medium transition-colors ${
            config.showHeading
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {config.showHeading ? '見出しを使用（押下でOFF）' : '見出しを使用する'}
        </button>

        {config.showHeading && (
          <div className="space-y-4">
            <FloatingInput
              label="見出し"
              value={config.heading || ''}
              onChange={(value) => updateConfig({ heading: value })}
            />

            <FloatingInput
              label="フォントサイズ（rem）"
              type="number"
              step="0.1"
              value={config.headingFontSize?.toString() || ''}
              onChange={(value) => {
                const num = parseFloat(value);
                updateConfig({ headingFontSize: !isNaN(num) ? num : 1 });
              }}
            />

            <FloatingSelect
              label="フォントウェイト"
              value={config.headingFontWeight || 'normal'}
              onChange={(value) => updateConfig({ headingFontWeight: value as 'normal' | 'bold' })}
              options={[
                { value: 'normal', label: '通常' },
                { value: 'bold', label: '太字' },
              ]}
            />

            <ColorPicker
              label="テキストカラー"
              value={config.headingTextColor || ''}
              onChange={(value) => updateConfig({ headingTextColor: value })}
            />

            <FloatingSelect
              label="配置"
              value={config.headingAlignment || 'left'}
              onChange={(value) => updateConfig({ headingAlignment: value as 'left' | 'center' | 'right' })}
              options={[
                { value: 'left', label: '左詰め' },
                { value: 'center', label: '中央' },
                { value: 'right', label: '右詰め' },
              ]}
            />
          </div>
        )}
      </div>

      {/* テキストセクション */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => updateConfig({ showText: !config.showText })}
          className={`w-full py-3 px-4 rounded-full text-sm font-medium transition-colors ${
            config.showText
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {config.showText ? 'テキストを使用（押下でOFF）' : 'テキストを使用する'}
        </button>

        {config.showText && (
          <div className="space-y-4">
            <FloatingInput
              label="テキスト"
              value={config.description || ''}
              onChange={(value) => updateConfig({ description: value })}
              multiline
              rows={3}
            />

            <FloatingInput
              label="フォントサイズ（rem）"
              type="number"
              step="0.1"
              value={config.textFontSize?.toString() || ''}
              onChange={(value) => {
                const num = parseFloat(value);
                updateConfig({ textFontSize: !isNaN(num) ? num : 1 });
              }}
            />

            <FloatingSelect
              label="フォントウェイト"
              value={config.textFontWeight || 'normal'}
              onChange={(value) => updateConfig({ textFontWeight: value as 'normal' | 'bold' })}
              options={[
                { value: 'normal', label: '通常' },
                { value: 'bold', label: '太字' },
              ]}
            />

            <ColorPicker
              label="テキストカラー"
              value={config.textColor || ''}
              onChange={(value) => updateConfig({ textColor: value })}
            />

            <FloatingSelect
              label="配置"
              value={config.textAlignment || 'left'}
              onChange={(value) => updateConfig({ textAlignment: value as 'left' | 'center' | 'right' })}
              options={[
                { value: 'left', label: '左詰め' },
                { value: 'center', label: '中央' },
                { value: 'right', label: '右詰め' },
              ]}
            />
          </div>
        )}
      </div>

      {/* ライターセクション */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => updateConfig({ showWriters: !config.showWriters })}
          className={`w-full py-3 px-4 rounded-full text-sm font-medium transition-colors ${
            config.showWriters
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {config.showWriters ? 'ライターを使用（押下でOFF）' : 'ライターを使用する'}
        </button>

        {config.showWriters && (
          <div className="space-y-4">
            <FloatingSelect
              label="レイアウト"
              value={config.writerLayout || 'horizontal'}
              onChange={(value) => updateConfig({ writerLayout: value as 'horizontal' | 'vertical' })}
              options={[
                { value: 'horizontal', label: '横並び' },
                { value: 'vertical', label: '縦並び' },
              ]}
            />

            <ColorPicker
              label="ライター名の色"
              value={config.writerNameColor || ''}
              onChange={(value) => updateConfig({ writerNameColor: value })}
            />

            <ColorPicker
              label="肩書きの色"
              value={config.jobTitleColor || ''}
              onChange={(value) => updateConfig({ jobTitleColor: value })}
            />

            <FloatingInput
              label="ボタンテキスト"
              value={config.buttonText || 'VIEW MORE'}
              onChange={(value) => updateConfig({ buttonText: value })}
            />

            <ColorPicker
              label="ボタンテキストカラー"
              value={config.buttonTextColor || ''}
              onChange={(value) => updateConfig({ buttonTextColor: value })}
            />

            <ColorPicker
              label="ボタン背景色"
              value={config.buttonBackgroundColor || ''}
              onChange={(value) => updateConfig({ buttonBackgroundColor: value })}
            />

            <ColorPicker
              label="ボタン枠線色"
              value={config.buttonBorderColor || ''}
              onChange={(value) => updateConfig({ buttonBorderColor: value })}
            />

            {/* ライター追加 */}
            <div className="space-y-2">
              {(config.writers || []).map((writer, index) => (
                <div key={index} className="p-4 border border-gray-300 rounded-lg space-y-4">
                  <FloatingSelect
                    label="ライター"
                    value={writer.writerId || ''}
                    onChange={(value) => {
                      const newWriters = [...(config.writers || [])];
                      newWriters[index] = { ...newWriters[index], writerId: value };
                      updateConfig({ writers: newWriters });
                    }}
                    options={availableWriters.map(w => ({
                      value: w.id,
                      label: w.handleName,
                    }))}
                  />

                  <FloatingInput
                    label="肩書き"
                    value={writer.jobTitle || ''}
                    onChange={(value) => {
                      const newWriters = [...(config.writers || [])];
                      newWriters[index] = { ...newWriters[index], jobTitle: value };
                      updateConfig({ writers: newWriters });
                    }}
                  />

                  {/* 削除ボタン */}
                  <button
                    type="button"
                    onClick={() => {
                      const newWriters = (config.writers || []).filter((_, i) => i !== index);
                      updateConfig({ writers: newWriters });
                    }}
                    className="w-full flex items-center justify-center py-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                    title="削除"
                  >
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newWriters = [...(config.writers || []), { writerId: '', jobTitle: '' }];
                  updateConfig({ writers: newWriters });
                }}
                className="w-full py-2 px-4 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                + ライターを追加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ボタンセクション */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => updateConfig({ showButtons: !config.showButtons })}
          className={`w-full py-3 px-4 rounded-full text-sm font-medium transition-colors ${
            config.showButtons
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {config.showButtons ? 'ボタンを使用（押下でOFF）' : 'ボタンを使用する'}
        </button>

        {config.showButtons && (
          <div className="space-y-4">
            <FloatingSelect
              label="ボタンレイアウト"
              value={config.buttonLayout || 'horizontal'}
              onChange={(value) => updateConfig({ buttonLayout: value as 'horizontal' | '2x2' | 'vertical' })}
              options={[
                { value: 'horizontal', label: '横並び' },
                { value: '2x2', label: '2×2グリッド' },
                { value: 'vertical', label: '縦並び' },
              ]}
            />

            {(config.buttons || []).map((button, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">ボタン {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeButton(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    削除
                  </button>
                </div>

                <FloatingSelect
                  label="ボタンタイプ"
                  value={button.type || 'text'}
                  onChange={(value) => updateButton(index, { type: value as 'text' | 'image' })}
                  options={[
                    { value: 'text', label: 'テキストボタン' },
                    { value: 'image', label: '画像ボタン' },
                  ]}
                />

                {/* テキストボタンの設定 */}
                {(!button.type || button.type === 'text') && (
                  <>
                    <FloatingInput
                      label="ボタンテキスト"
                      value={button.text || ''}
                      onChange={(value) => updateButton(index, { text: value })}
                    />

                    <ColorPicker
                      label="ボタンカラー"
                      value={button.buttonColor || ''}
                      onChange={(value) => updateButton(index, { buttonColor: value })}
                    />

                    <FloatingInput
                      label="フォントサイズ（rem）"
                      type="number"
                      step="0.1"
                      value={button.fontSize?.toString() || ''}
                      onChange={(value) => {
                        const num = parseFloat(value);
                        updateButton(index, { fontSize: !isNaN(num) ? num : 1 });
                      }}
                    />

                    <FloatingSelect
                      label="フォントウェイト"
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
                  </>
                )}

                {/* 画像ボタンの設定 */}
                {button.type === 'image' && (
                  <>
                    <FeaturedImageUpload
                      label="画像"
                      value={button.imageUrl || ''}
                      onChange={(imageUrl) => updateButton(index, { imageUrl })}
                      showAltInput={false}
                    />

                    <FloatingInput
                      label="画像alt属性"
                      value={button.imageAlt || ''}
                      onChange={(value) => updateButton(index, { imageAlt: value })}
                    />

                    <FloatingInput
                      label="画像幅（px）※空欄可"
                      type="number"
                      value={button.imageWidth?.toString() || ''}
                      onChange={(value) => {
                        if (!value || value === '') {
                          updateButton(index, { imageWidth: undefined });
                        } else {
                          const num = parseInt(value);
                          updateButton(index, { imageWidth: !isNaN(num) && num > 0 ? num : undefined });
                        }
                      }}
                    />

                    <FloatingInput
                      label="画像高さ（px）※空欄可"
                      type="number"
                      value={button.imageHeight?.toString() || ''}
                      onChange={(value) => {
                        if (!value || value === '') {
                          updateButton(index, { imageHeight: undefined });
                        } else {
                          const num = parseInt(value);
                          updateButton(index, { imageHeight: !isNaN(num) && num > 0 ? num : undefined });
                        }
                      }}
                    />
                  </>
                )}

                <FloatingInput
                  label="リンク先URL"
                  value={button.url || ''}
                  onChange={(value) => updateButton(index, { url: value })}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`openInNewTab-${index}`}
                    checked={button.openInNewTab || false}
                    onChange={(e) => updateButton(index, { openInNewTab: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`openInNewTab-${index}`} className="text-sm text-gray-700">
                    新しいタブで開く
                  </label>
                </div>
              </div>
            ))}

            {(config.buttons || []).length < 4 && (
              <button
                type="button"
                onClick={addButton}
                className="w-full py-2 px-4 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                + ボタンを追加
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

