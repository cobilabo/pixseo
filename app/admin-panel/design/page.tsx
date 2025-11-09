'use client';

import { useState, useEffect } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme } from '@/types/theme';
import ColorPicker from '@/components/admin/ColorPicker';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import AdminLayout from '@/components/admin/AdminLayout';
import AuthGuard from '@/components/admin/AuthGuard';
import { apiClient } from '@/lib/api-client';

export default function DesignPage() {
  const { currentTenant } = useMediaTenant();
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      fetchDesignSettings();
    }
  }, [currentTenant]);

  const fetchDesignSettings = async () => {
    try {
      setFetchLoading(true);
      const response = await apiClient.get('/api/admin/design');
      const data = await response.json();
      setTheme(data.theme || defaultTheme);
    } catch (error) {
      console.error('デザイン設定の取得に失敗しました:', error);
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
      const response = await apiClient.put('/api/admin/design', { theme });
      
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

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="p-8 animate-fadeIn pb-32">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">デザイン</h1>
              <p className="text-gray-600 mt-1">メインサイトのデザインをカスタマイズ</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                リセット
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>

          {/* 全体を1つのパネルに */}
          <div className="bg-white rounded-[1.75rem] p-8 space-y-6">
            
            {/* 背景色 */}
            <ColorPicker label="全体背景色" value={theme.backgroundColor} onChange={(v) => updateTheme('backgroundColor', v)} />
            <ColorPicker label="ヘッダー背景色" value={theme.headerBackgroundColor} onChange={(v) => updateTheme('headerBackgroundColor', v)} />
            <ColorPicker label="フッター背景色" value={theme.footerBackgroundColor} onChange={(v) => updateTheme('footerBackgroundColor', v)} />
            <ColorPicker label="パネル背景色" value={theme.panelBackgroundColor} onChange={(v) => updateTheme('panelBackgroundColor', v)} />

            {/* H2 */}
            <ColorPicker label="H2 テキストカラー" value={theme.h2Color} onChange={(v) => updateTheme('h2Color', v)} />
            <ColorPicker label="H2 背景色" value={theme.h2BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h2BackgroundColor', v)} allowOff />
            <ColorPicker label="H2 左ボーダーカラー" value={theme.h2LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h2LeftBorderColor', v)} allowOff />
            <ColorPicker label="H2 下ボーダーカラー" value={theme.h2BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h2BottomBorderColor', v)} allowOff />
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">H2 アイコン</label>
              <FeaturedImageUpload
                value={theme.h2Icon || ''}
                onChange={(url) => updateTheme('h2Icon', url)}
                label="アイコン画像を選択"
              />
            </div>

            {/* H3 */}
            <ColorPicker label="H3 テキストカラー" value={theme.h3Color} onChange={(v) => updateTheme('h3Color', v)} />
            <ColorPicker label="H3 背景色" value={theme.h3BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h3BackgroundColor', v)} allowOff />
            <ColorPicker label="H3 左ボーダーカラー" value={theme.h3LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h3LeftBorderColor', v)} allowOff />
            <ColorPicker label="H3 下ボーダーカラー" value={theme.h3BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h3BottomBorderColor', v)} allowOff />
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">H3 アイコン</label>
              <FeaturedImageUpload
                value={theme.h3Icon || ''}
                onChange={(url) => updateTheme('h3Icon', url)}
                label="アイコン画像を選択"
              />
            </div>

            {/* H4 */}
            <ColorPicker label="H4 テキストカラー" value={theme.h4Color} onChange={(v) => updateTheme('h4Color', v)} />
            <ColorPicker label="H4 背景色" value={theme.h4BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h4BackgroundColor', v)} allowOff />
            <ColorPicker label="H4 左ボーダーカラー" value={theme.h4LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h4LeftBorderColor', v)} allowOff />
            <ColorPicker label="H4 下ボーダーカラー" value={theme.h4BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h4BottomBorderColor', v)} allowOff />
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">H4 アイコン</label>
              <FeaturedImageUpload
                value={theme.h4Icon || ''}
                onChange={(url) => updateTheme('h4Icon', url)}
                label="アイコン画像を選択"
              />
            </div>

            {/* テキストカラー */}
            <ColorPicker label="本文テキスト" value={theme.textColor} onChange={(v) => updateTheme('textColor', v)} />
            <ColorPicker label="リンクカラー" value={theme.linkColor} onChange={(v) => updateTheme('linkColor', v)} />
            <ColorPicker label="リンクホバーカラー" value={theme.linkHoverColor} onChange={(v) => updateTheme('linkHoverColor', v)} />

            {/* ボタンカラー */}
            <ColorPicker label="プライマリボタン 背景色" value={theme.primaryButtonColor} onChange={(v) => updateTheme('primaryButtonColor', v)} />
            <ColorPicker label="プライマリボタン テキスト色" value={theme.primaryButtonTextColor} onChange={(v) => updateTheme('primaryButtonTextColor', v)} />
            <ColorPicker label="セカンダリボタン 背景色" value={theme.secondaryButtonColor} onChange={(v) => updateTheme('secondaryButtonColor', v)} />
            <ColorPicker label="セカンダリボタン テキスト色" value={theme.secondaryButtonTextColor} onChange={(v) => updateTheme('secondaryButtonTextColor', v)} />

            {/* 引用 */}
            <ColorPicker label="引用 背景色" value={theme.quoteBackgroundColor} onChange={(v) => updateTheme('quoteBackgroundColor', v)} />
            <ColorPicker label="引用 ボーダーカラー" value={theme.quoteBorderColor} onChange={(v) => updateTheme('quoteBorderColor', v)} />
            <ColorPicker label="引用 テキストカラー" value={theme.quoteTextColor} onChange={(v) => updateTheme('quoteTextColor', v)} />

            {/* 参照 */}
            <ColorPicker label="参照 背景色" value={theme.referenceBackgroundColor} onChange={(v) => updateTheme('referenceBackgroundColor', v)} />
            <ColorPicker label="参照 ボーダーカラー" value={theme.referenceBorderColor} onChange={(v) => updateTheme('referenceBorderColor', v)} />
            <ColorPicker label="参照 テキストカラー" value={theme.referenceTextColor} onChange={(v) => updateTheme('referenceTextColor', v)} />

            {/* 表 */}
            <ColorPicker label="表 ヘッダー背景色" value={theme.tableHeaderBackgroundColor} onChange={(v) => updateTheme('tableHeaderBackgroundColor', v)} />
            <ColorPicker label="表 ヘッダーテキスト色" value={theme.tableHeaderTextColor} onChange={(v) => updateTheme('tableHeaderTextColor', v)} />
            <ColorPicker label="表 ボーダーカラー" value={theme.tableBorderColor} onChange={(v) => updateTheme('tableBorderColor', v)} />
            <ColorPicker label="表 ストライプ背景色" value={theme.tableStripedColor} onChange={(v) => updateTheme('tableStripedColor', v)} />

            {/* その他 */}
            <ColorPicker label="汎用ボーダーカラー" value={theme.borderColor} onChange={(v) => updateTheme('borderColor', v)} />
            <ColorPicker label="区切り線カラー" value={theme.dividerColor} onChange={(v) => updateTheme('dividerColor', v)} />
            <FloatingInput
              label="シャドウカラー（RGBA形式）"
              value={theme.shadowColor}
              onChange={(v) => updateTheme('shadowColor', v)}
              placeholder="rgba(0, 0, 0, 0.1)"
            />
          </div>
        </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
