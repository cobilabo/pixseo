'use client';

import { useState, useEffect } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme, THEME_LAYOUTS, ThemeLayoutId, FooterBlock } from '@/types/theme';
import ColorPicker from '@/components/admin/ColorPicker';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import AdminLayout from '@/components/admin/AdminLayout';
import AuthGuard from '@/components/admin/AuthGuard';
import { apiClient } from '@/lib/api-client';

export default function ThemePage() {
  const { currentTenant } = useMediaTenant();
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      fetchThemeSettings();
    }
  }, [currentTenant]);

  const fetchThemeSettings = async () => {
    try {
      setFetchLoading(true);
      const response = await apiClient.get('/api/admin/theme');
      const data = await response.json();
      setTheme(data.theme || defaultTheme);
    } catch (error) {
      console.error('テーマ設定の取得に失敗しました:', error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentTenant) {
      alert('サービスが選択されていません');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.put('/api/admin/theme', { theme });
      
      if (response.ok) {
        alert('デザイン設定を保存しました');
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || '保存に失敗しました'}`);
      }
    } catch (error) {
      console.error('デザイン設定の保存に失敗しました:', error);
      alert('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('デフォルト設定にリセットしますか？')) {
      setTheme(defaultTheme);
    }
  };

  const updateTheme = (key: keyof Theme, value: any) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  // フッターブロック関連の関数
  const updateFooterBlock = (index: number, field: keyof FooterBlock, value: string) => {
    const newBlocks = [...(theme.footerBlocks || [])];
    while (newBlocks.length <= index) {
      newBlocks.push({ imageUrl: '', alt: '', linkUrl: '' });
    }
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setTheme(prev => ({ ...prev, footerBlocks: newBlocks }));
  };

  const removeFooterBlock = (index: number) => {
    const newBlocks = (theme.footerBlocks || []).filter((_, i) => i !== index);
    setTheme(prev => ({ ...prev, footerBlocks: newBlocks }));
  };

  const selectedThemeLayout = THEME_LAYOUTS[theme.layoutTheme as ThemeLayoutId] || THEME_LAYOUTS.cobi;

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="animate-fadeIn pb-32 space-y-6">
          
          {/* テーマ選択 */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">レイアウトテーマ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(THEME_LAYOUTS).map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => updateTheme('layoutTheme', layout.id)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    theme.layoutTheme === layout.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{layout.displayName}</h3>
                    {theme.layoutTheme === layout.id && (
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{layout.description}</p>
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold">ブロック配置場所:</span>{' '}
                    {layout.blockPlacements.map(p => p.label).join('、')}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>現在選択中:</strong> {selectedThemeLayout.displayName}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                ブロック作成時に、このテーマの配置場所が選択できます。
              </p>
            </div>
          </div>
          
          {/* 基本カラー */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">基本カラー</h2>
            <div className="grid grid-cols-3 gap-6">
              <ColorPicker label="メインカラー" value={theme.primaryColor} onChange={(v) => updateTheme('primaryColor', v)} />
              <ColorPicker label="サブカラー" value={theme.secondaryColor} onChange={(v) => updateTheme('secondaryColor', v)} />
              <ColorPicker label="アクセントカラー" value={theme.accentColor} onChange={(v) => updateTheme('accentColor', v)} />
            </div>
          </div>

          {/* 背景色 */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">背景色</h2>
            <div className="grid grid-cols-2 gap-6">
              <ColorPicker label="全体背景色" value={theme.backgroundColor} onChange={(v) => updateTheme('backgroundColor', v)} />
              <ColorPicker label="ヘッダー背景色" value={theme.headerBackgroundColor} onChange={(v) => updateTheme('headerBackgroundColor', v)} />
              <ColorPicker label="フッター背景色" value={theme.footerBackgroundColor} onChange={(v) => updateTheme('footerBackgroundColor', v)} />
              <ColorPicker label="ブロック背景色" value={theme.blockBackgroundColor} onChange={(v) => updateTheme('blockBackgroundColor', v)} />
            </div>
          </div>

          {/* リンク */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">リンク</h2>
            <div className="grid grid-cols-2 gap-6">
              <ColorPicker label="リンクテキストカラー" value={theme.linkColor} onChange={(v) => updateTheme('linkColor', v)} />
              <ColorPicker label="リンクホバーカラー" value={theme.linkHoverColor} onChange={(v) => updateTheme('linkHoverColor', v)} />
            </div>
          </div>

          {/* 装飾 */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">装飾</h2>
            <div className="grid grid-cols-2 gap-6">
              <ColorPicker label="ボーダーカラー" value={theme.borderColor} onChange={(v) => updateTheme('borderColor', v)} />
              <FloatingInput
                label="シャドウカラー（RGBA形式）"
                value={theme.shadowColor}
                onChange={(v) => updateTheme('shadowColor', v)}
                placeholder="rgba(0, 0, 0, 0.1)"
              />
            </div>
          </div>

          {/* 見出しデザイン（H2） */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">見出しデザイン（H2）</h2>
            <div className="grid grid-cols-2 gap-6">
              <ColorPicker label="H2 テキストカラー" value={theme.h2Color} onChange={(v) => updateTheme('h2Color', v)} />
              <ColorPicker label="H2 背景色" value={theme.h2BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h2BackgroundColor', v)} allowOff />
              <ColorPicker label="H2 左ボーダーカラー" value={theme.h2LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h2LeftBorderColor', v)} allowOff />
              <ColorPicker label="H2 下ボーダーカラー" value={theme.h2BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h2BottomBorderColor', v)} allowOff />
            </div>
          </div>

          {/* 見出しデザイン（H3） */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">見出しデザイン（H3）</h2>
            <div className="grid grid-cols-2 gap-6">
              <ColorPicker label="H3 テキストカラー" value={theme.h3Color} onChange={(v) => updateTheme('h3Color', v)} />
              <ColorPicker label="H3 背景色" value={theme.h3BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h3BackgroundColor', v)} allowOff />
              <ColorPicker label="H3 左ボーダーカラー" value={theme.h3LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h3LeftBorderColor', v)} allowOff />
              <ColorPicker label="H3 下ボーダーカラー" value={theme.h3BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h3BottomBorderColor', v)} allowOff />
            </div>
          </div>

          {/* 見出しデザイン（H4） */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">見出しデザイン（H4）</h2>
            <div className="grid grid-cols-2 gap-6">
              <ColorPicker label="H4 テキストカラー" value={theme.h4Color} onChange={(v) => updateTheme('h4Color', v)} />
              <ColorPicker label="H4 背景色" value={theme.h4BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h4BackgroundColor', v)} allowOff />
              <ColorPicker label="H4 左ボーダーカラー" value={theme.h4LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h4LeftBorderColor', v)} allowOff />
              <ColorPicker label="H4 下ボーダーカラー" value={theme.h4BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h4BottomBorderColor', v)} allowOff />
            </div>
          </div>

          {/* カスタムCSS */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">カスタムCSS</h2>
            <p className="text-sm text-gray-600 mb-4">
              より細かいデザイン調整が必要な場合は、こちらにCSSを記述してください。
            </p>
            <textarea
              value={theme.customCss || ''}
              onChange={(e) => updateTheme('customCss', e.target.value)}
              placeholder="例: .article-content p { line-height: 1.8; }"
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
            />
          </div>

          {/* フッターブロック */}
          <div className="bg-white rounded-[1.75rem] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">フッターブロック</h2>
            <p className="text-sm text-gray-600 mb-6">
              フッターエリアに表示するバナーを最大4つまで設定できます。
            </p>
            
            <div className="space-y-8">
              {[0, 1, 2, 3].map((index) => {
                const block = theme.footerBlocks?.[index] || { imageUrl: '', alt: '', linkUrl: '' };
                const hasImage = Boolean(block.imageUrl);
                
                return (
                  <div key={index} className="p-6 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">バナー {index + 1}</h3>
                      {hasImage && (
                        <button
                          type="button"
                          onClick={() => removeFooterBlock(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          削除
                        </button>
                      )}
                    </div>
                    
                    {/* 画像アップロード */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        バナー画像
                      </label>
                      <FeaturedImageUpload
                        value={block.imageUrl}
                        onChange={(url) => updateFooterBlock(index, 'imageUrl', url)}
                      />
                    </div>

                    {/* Alt属性 */}
                    {hasImage && (
                      <>
                        <div className="mb-4">
                          <FloatingInput
                            label="Alt属性"
                            value={block.alt}
                            onChange={(value) => updateFooterBlock(index, 'alt', value)}
                          />
                        </div>

                        {/* リンクURL */}
                        <div>
                          <FloatingInput
                            label="リンク先URL（任意）"
                            value={block.linkUrl}
                            onChange={(value) => updateFooterBlock(index, 'linkUrl', value)}
                            type="url"
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            {/* リセットボタン */}
            <button
              type="button"
              onClick={handleReset}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center shadow-custom"
              title="リセット"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* 保存ボタン */}
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-custom"
              title="保存"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
