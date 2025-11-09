'use client';

import { useState, useEffect } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, HeadingStyle, defaultTheme } from '@/types/theme';
import ColorPicker from '@/components/admin/ColorPicker';
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

  const headingStyleOptions: { value: HeadingStyle; label: string }[] = [
    { value: 'default', label: 'デフォルト' },
    { value: 'border-left', label: '左ボーダー' },
    { value: 'border-bottom', label: '下ボーダー' },
    { value: 'background', label: '背景色' },
    { value: 'rounded', label: 'ラウンド' },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="p-8 animate-fadeIn">
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

          {/* レイアウトテーマ選択 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">レイアウトテーマ</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border-2 border-blue-500 rounded-xl bg-blue-50">
                <input
                  type="radio"
                  checked={theme.layoutTheme === 'theme1'}
                  onChange={() => updateTheme('layoutTheme', 'theme1')}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-semibold text-gray-900">レイアウトテーマ 1</div>
                  <div className="text-sm text-gray-600">現在のデフォルトテーマ</div>
                </div>
              </label>
            </div>
          </div>

          {/* 背景色設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">背景色</h2>
            <div className="space-y-4">
              <ColorPicker
                label="全体背景色"
                value={theme.backgroundColor}
                onChange={(value) => updateTheme('backgroundColor', value)}
                description="サイト全体の背景色"
              />
              <ColorPicker
                label="ヘッダー背景色"
                value={theme.headerBackgroundColor}
                onChange={(value) => updateTheme('headerBackgroundColor', value)}
              />
              <ColorPicker
                label="フッター背景色"
                value={theme.footerBackgroundColor}
                onChange={(value) => updateTheme('footerBackgroundColor', value)}
              />
              <ColorPicker
                label="パネル背景色"
                value={theme.panelBackgroundColor}
                onChange={(value) => updateTheme('panelBackgroundColor', value)}
                description="カードやパネルの背景色"
              />
            </div>
          </div>

          {/* H2設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">H2（見出し2）デザイン</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">スタイル</label>
                <select
                  value={theme.h2Style}
                  onChange={(e) => updateTheme('h2Style', e.target.value as HeadingStyle)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                >
                  {headingStyleOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <ColorPicker
                label="テキストカラー"
                value={theme.h2Color}
                onChange={(value) => updateTheme('h2Color', value)}
              />
              {(theme.h2Style === 'background' || theme.h2Style === 'rounded') && (
                <ColorPicker
                  label="背景色"
                  value={theme.h2BackgroundColor || '#f3f4f6'}
                  onChange={(value) => updateTheme('h2BackgroundColor', value)}
                />
              )}
              {(theme.h2Style === 'border-left' || theme.h2Style === 'border-bottom') && (
                <ColorPicker
                  label="ボーダーカラー"
                  value={theme.h2BorderColor || '#3b82f6'}
                  onChange={(value) => updateTheme('h2BorderColor', value)}
                />
              )}
            </div>
          </div>

          {/* H3設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">H3（見出し3）デザイン</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">スタイル</label>
                <select
                  value={theme.h3Style}
                  onChange={(e) => updateTheme('h3Style', e.target.value as HeadingStyle)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                >
                  {headingStyleOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <ColorPicker
                label="テキストカラー"
                value={theme.h3Color}
                onChange={(value) => updateTheme('h3Color', value)}
              />
              {(theme.h3Style === 'background' || theme.h3Style === 'rounded') && (
                <ColorPicker
                  label="背景色"
                  value={theme.h3BackgroundColor || '#f3f4f6'}
                  onChange={(value) => updateTheme('h3BackgroundColor', value)}
                />
              )}
              {(theme.h3Style === 'border-left' || theme.h3Style === 'border-bottom') && (
                <ColorPicker
                  label="ボーダーカラー"
                  value={theme.h3BorderColor || '#9ca3af'}
                  onChange={(value) => updateTheme('h3BorderColor', value)}
                />
              )}
            </div>
          </div>

          {/* H4設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">H4（見出し4）デザイン</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">スタイル</label>
                <select
                  value={theme.h4Style}
                  onChange={(e) => updateTheme('h4Style', e.target.value as HeadingStyle)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                >
                  {headingStyleOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <ColorPicker
                label="テキストカラー"
                value={theme.h4Color}
                onChange={(value) => updateTheme('h4Color', value)}
              />
              {(theme.h4Style === 'background' || theme.h4Style === 'rounded') && (
                <ColorPicker
                  label="背景色"
                  value={theme.h4BackgroundColor || '#f3f4f6'}
                  onChange={(value) => updateTheme('h4BackgroundColor', value)}
                />
              )}
              {(theme.h4Style === 'border-left' || theme.h4Style === 'border-bottom') && (
                <ColorPicker
                  label="ボーダーカラー"
                  value={theme.h4BorderColor || '#d1d5db'}
                  onChange={(value) => updateTheme('h4BorderColor', value)}
                />
              )}
            </div>
          </div>

          {/* テキストカラー設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">テキストカラー</h2>
            <div className="space-y-4">
              <ColorPicker
                label="本文テキスト"
                value={theme.textColor}
                onChange={(value) => updateTheme('textColor', value)}
              />
              <ColorPicker
                label="リンクカラー"
                value={theme.linkColor}
                onChange={(value) => updateTheme('linkColor', value)}
              />
              <ColorPicker
                label="リンクホバーカラー"
                value={theme.linkHoverColor}
                onChange={(value) => updateTheme('linkHoverColor', value)}
              />
            </div>
          </div>

          {/* ボタンカラー設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">ボタンカラー</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">ボタンカラー 1（プライマリ）</h3>
                <div className="space-y-4">
                  <ColorPicker
                    label="背景色"
                    value={theme.primaryButtonColor}
                    onChange={(value) => updateTheme('primaryButtonColor', value)}
                  />
                  <ColorPicker
                    label="テキスト色"
                    value={theme.primaryButtonTextColor}
                    onChange={(value) => updateTheme('primaryButtonTextColor', value)}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">ボタンカラー 2（セカンダリ）</h3>
                <div className="space-y-4">
                  <ColorPicker
                    label="背景色"
                    value={theme.secondaryButtonColor}
                    onChange={(value) => updateTheme('secondaryButtonColor', value)}
                  />
                  <ColorPicker
                    label="テキスト色"
                    value={theme.secondaryButtonTextColor}
                    onChange={(value) => updateTheme('secondaryButtonTextColor', value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 引用設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">引用デザイン</h2>
            <div className="space-y-4">
              <ColorPicker
                label="背景色"
                value={theme.quoteBackgroundColor}
                onChange={(value) => updateTheme('quoteBackgroundColor', value)}
              />
              <ColorPicker
                label="ボーダーカラー"
                value={theme.quoteBorderColor}
                onChange={(value) => updateTheme('quoteBorderColor', value)}
              />
              <ColorPicker
                label="テキストカラー"
                value={theme.quoteTextColor}
                onChange={(value) => updateTheme('quoteTextColor', value)}
              />
            </div>
          </div>

          {/* 参照設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">参照デザイン</h2>
            <div className="space-y-4">
              <ColorPicker
                label="背景色"
                value={theme.referenceBackgroundColor}
                onChange={(value) => updateTheme('referenceBackgroundColor', value)}
              />
              <ColorPicker
                label="ボーダーカラー"
                value={theme.referenceBorderColor}
                onChange={(value) => updateTheme('referenceBorderColor', value)}
              />
              <ColorPicker
                label="テキストカラー"
                value={theme.referenceTextColor}
                onChange={(value) => updateTheme('referenceTextColor', value)}
              />
            </div>
          </div>

          {/* 表デザイン設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">表（テーブル）デザイン</h2>
            <div className="space-y-4">
              <ColorPicker
                label="ヘッダー背景色"
                value={theme.tableHeaderBackgroundColor}
                onChange={(value) => updateTheme('tableHeaderBackgroundColor', value)}
              />
              <ColorPicker
                label="ヘッダーテキスト色"
                value={theme.tableHeaderTextColor}
                onChange={(value) => updateTheme('tableHeaderTextColor', value)}
              />
              <ColorPicker
                label="ボーダーカラー"
                value={theme.tableBorderColor}
                onChange={(value) => updateTheme('tableBorderColor', value)}
              />
              <ColorPicker
                label="ストライプ背景色"
                value={theme.tableStripedColor}
                onChange={(value) => updateTheme('tableStripedColor', value)}
                description="奇数行の背景色"
              />
            </div>
          </div>

          {/* その他設定 */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">その他</h2>
            <div className="space-y-4">
              <ColorPicker
                label="ボーダーカラー"
                value={theme.borderColor}
                onChange={(value) => updateTheme('borderColor', value)}
                description="汎用ボーダー色"
              />
              <ColorPicker
                label="区切り線カラー"
                value={theme.dividerColor}
                onChange={(value) => updateTheme('dividerColor', value)}
              />
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    シャドウカラー
                  </label>
                  <p className="text-xs text-gray-500 mb-2">RGBA形式で指定</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={theme.shadowColor}
                    onChange={(e) => updateTheme('shadowColor', e.target.value)}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    placeholder="rgba(0, 0, 0, 0.1)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 保存ボタン（下部） */}
          <div className="flex justify-end gap-3">
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
        )}
      </AdminLayout>
    </AuthGuard>
  );
}

