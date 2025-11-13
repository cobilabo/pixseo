'use client';

import { useState, useEffect } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme, THEME_LAYOUTS, ThemeLayoutId, FooterBlock, FooterContent, FooterTextLink, FooterTextLinkSection } from '@/types/theme';
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
  const [activeTab, setActiveTab] = useState<'banner' | 'footer-content' | 'color' | 'css'>('banner');

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

  // フッターコンテンツ関連の関数
  const updateFooterContent = (index: number, field: keyof FooterContent, value: string) => {
    const newContents = [...(theme.footerContents || [])];
    while (newContents.length <= index) {
      newContents.push({ imageUrl: '', alt: '', title: '', description: '', linkUrl: '' });
    }
    newContents[index] = { ...newContents[index], [field]: value };
    setTheme(prev => ({ ...prev, footerContents: newContents }));
  };

  const removeFooterContent = (index: number) => {
    const newContents = (theme.footerContents || []).filter((_, i) => i !== index);
    setTheme(prev => ({ ...prev, footerContents: newContents }));
  };

  // テキストリンクセクション関連の関数
  const updateTextLinkSection = (sectionIndex: number, field: 'title', value: string) => {
    const newSections = [...(theme.footerTextLinkSections || [])];
    while (newSections.length <= sectionIndex) {
      newSections.push({ title: '', links: [] });
    }
    newSections[sectionIndex] = { ...newSections[sectionIndex], [field]: value };
    setTheme(prev => ({ ...prev, footerTextLinkSections: newSections }));
  };

  const updateTextLink = (sectionIndex: number, linkIndex: number, field: keyof FooterTextLink, value: string) => {
    const newSections = [...(theme.footerTextLinkSections || [])];
    while (newSections.length <= sectionIndex) {
      newSections.push({ title: '', links: [] });
    }
    const links = [...(newSections[sectionIndex].links || [])];
    while (links.length <= linkIndex) {
      links.push({ text: '', url: '' });
    }
    links[linkIndex] = { ...links[linkIndex], [field]: value };
    newSections[sectionIndex] = { ...newSections[sectionIndex], links };
    setTheme(prev => ({ ...prev, footerTextLinkSections: newSections }));
  };

  const removeTextLink = (sectionIndex: number, linkIndex: number) => {
    const newSections = [...(theme.footerTextLinkSections || [])];
    if (newSections[sectionIndex]) {
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        links: newSections[sectionIndex].links.filter((_, i) => i !== linkIndex),
      };
      setTheme(prev => ({ ...prev, footerTextLinkSections: newSections }));
    }
  };

  const selectedThemeLayout = THEME_LAYOUTS[theme.layoutTheme as ThemeLayoutId] || THEME_LAYOUTS.cobi;

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="animate-fadeIn pb-32 space-y-6">
          
          {/* テーマ選択 */}
          <div className="bg-white rounded-[1.75rem] p-8">
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
                  <p className="text-sm text-gray-600">{layout.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* タブメニュー */}
          <div className="bg-white rounded-[1.75rem] overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setActiveTab('banner')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'banner'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  バナーエリア
                </button>
                {theme.layoutTheme === 'cobi' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('footer-content')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'footer-content'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    フッターコンテンツ
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('color')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'color'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  カラー
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('css')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'css'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  CSS
                </button>
              </div>
            </div>

            {/* タブコンテンツ */}
            <div className="p-8">
              {/* バナーエリアタブ */}
              {activeTab === 'banner' && (
                <div className="space-y-8">
                  {/* バナーブロック */}
                  <div className="space-y-6">
                    {[0, 1, 2, 3].map((index) => {
                      const block = theme.footerBlocks?.[index] || { imageUrl: '', alt: '', linkUrl: '' };
                      const hasImage = Boolean(block.imageUrl);
                      
                      return (
                        <div key={index} className="p-6 border border-gray-200 rounded-xl">
                          {hasImage && (
                            <div className="flex justify-end mb-4">
                              <button
                                type="button"
                                onClick={() => removeFooterBlock(index)}
                                className="text-sm text-red-600 hover:text-red-700"
                              >
                                削除
                              </button>
                            </div>
                          )}
                          
                          <div className="mb-4">
                            <FeaturedImageUpload
                              value={block.imageUrl}
                              onChange={(url) => updateFooterBlock(index, 'imageUrl', url)}
                              label={`バナー ${index + 1}`}
                            />
                          </div>

                          {hasImage && (
                            <div>
                              <FloatingInput
                                label="リンク先URL"
                                value={block.linkUrl}
                                onChange={(value) => updateFooterBlock(index, 'linkUrl', value)}
                                type="url"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* テキストリンクセクション (cobi テーマ専用) */}
                  {theme.layoutTheme === 'cobi' && (
                    <div className="space-y-6 pt-8 border-t">
                      {[0, 1].map((sectionIndex) => {
                        const section = theme.footerTextLinkSections?.[sectionIndex] || { title: '', links: [] };
                        
                        return (
                          <div key={sectionIndex} className="p-6 border border-gray-200 rounded-xl">
                            <div className="mb-4">
                              <FloatingInput
                                label={`セクションタイトル ${sectionIndex + 1}`}
                                value={section.title}
                                onChange={(value) => updateTextLinkSection(sectionIndex, 'title', value)}
                              />
                            </div>

                            <div className="space-y-4">
                              {[0, 1, 2, 3, 4].map((linkIndex) => {
                                const link = section.links?.[linkIndex] || { text: '', url: '' };
                                const hasLink = Boolean(link.text || link.url);
                                
                                return (
                                  <div key={linkIndex} className="p-4 bg-gray-50 rounded-lg">
                                    {hasLink && (
                                      <div className="flex justify-end mb-2">
                                        <button
                                          type="button"
                                          onClick={() => removeTextLink(sectionIndex, linkIndex)}
                                          className="text-xs text-red-600 hover:text-red-700"
                                        >
                                          削除
                                        </button>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                      <FloatingInput
                                        label={`リンクテキスト ${linkIndex + 1}`}
                                        value={link.text}
                                        onChange={(value) => updateTextLink(sectionIndex, linkIndex, 'text', value)}
                                      />
                                      <FloatingInput
                                        label={`URL ${linkIndex + 1}`}
                                        value={link.url}
                                        onChange={(value) => updateTextLink(sectionIndex, linkIndex, 'url', value)}
                                        type="url"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* フッターコンテンツタブ (cobi テーマ専用) */}
              {activeTab === 'footer-content' && (
                <div className="space-y-6">
                  {[0, 1, 2].map((index) => {
                    const content = theme.footerContents?.[index] || { imageUrl: '', alt: '', title: '', description: '', linkUrl: '' };
                    const hasImage = Boolean(content.imageUrl);
                    
                    return (
                      <div key={index} className="p-6 border border-gray-200 rounded-xl">
                        {hasImage && (
                          <div className="flex justify-end mb-4">
                            <button
                              type="button"
                              onClick={() => removeFooterContent(index)}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              削除
                            </button>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <FeaturedImageUpload
                            value={content.imageUrl}
                            onChange={(url) => updateFooterContent(index, 'imageUrl', url)}
                            label={`コンテンツ ${index + 1}`}
                          />
                        </div>

                        {hasImage && (
                          <>
                            <div className="mb-4">
                              <FloatingInput
                                label="タイトル"
                                value={content.title}
                                onChange={(value) => updateFooterContent(index, 'title', value)}
                              />
                            </div>

                            <div className="mb-4">
                              <FloatingInput
                                label="説明"
                                value={content.description}
                                onChange={(value) => updateFooterContent(index, 'description', value)}
                                multiline
                                rows={3}
                              />
                            </div>

                            <div>
                              <FloatingInput
                                label="リンク先URL"
                                value={content.linkUrl}
                                onChange={(value) => updateFooterContent(index, 'linkUrl', value)}
                                type="url"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* カラータブ */}
              {activeTab === 'color' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    <ColorPicker label="メインカラー" value={theme.primaryColor} onChange={(v) => updateTheme('primaryColor', v)} />
                    <ColorPicker label="サブカラー" value={theme.secondaryColor} onChange={(v) => updateTheme('secondaryColor', v)} />
                    <ColorPicker label="アクセントカラー" value={theme.accentColor} onChange={(v) => updateTheme('accentColor', v)} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <ColorPicker label="全体背景色" value={theme.backgroundColor} onChange={(v) => updateTheme('backgroundColor', v)} />
                    <ColorPicker label="ヘッダー背景色" value={theme.headerBackgroundColor} onChange={(v) => updateTheme('headerBackgroundColor', v)} />
                    <ColorPicker label="フッター背景色" value={theme.footerBackgroundColor} onChange={(v) => updateTheme('footerBackgroundColor', v)} />
                    <ColorPicker label="ブロック背景色" value={theme.blockBackgroundColor} onChange={(v) => updateTheme('blockBackgroundColor', v)} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <ColorPicker label="リンクテキストカラー" value={theme.linkColor} onChange={(v) => updateTheme('linkColor', v)} />
                    <ColorPicker label="リンクホバーカラー" value={theme.linkHoverColor} onChange={(v) => updateTheme('linkHoverColor', v)} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <ColorPicker label="ボーダーカラー" value={theme.borderColor} onChange={(v) => updateTheme('borderColor', v)} />
                    <FloatingInput
                      label="シャドウカラー（RGBA形式）"
                      value={theme.shadowColor}
                      onChange={(v) => updateTheme('shadowColor', v)}
                      placeholder="rgba(0, 0, 0, 0.1)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <ColorPicker label="H2 テキストカラー" value={theme.h2Color} onChange={(v) => updateTheme('h2Color', v)} />
                    <ColorPicker label="H2 背景色" value={theme.h2BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h2BackgroundColor', v)} allowOff />
                    <ColorPicker label="H2 左ボーダーカラー" value={theme.h2LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h2LeftBorderColor', v)} allowOff />
                    <ColorPicker label="H2 下ボーダーカラー" value={theme.h2BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h2BottomBorderColor', v)} allowOff />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <ColorPicker label="H3 テキストカラー" value={theme.h3Color} onChange={(v) => updateTheme('h3Color', v)} />
                    <ColorPicker label="H3 背景色" value={theme.h3BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h3BackgroundColor', v)} allowOff />
                    <ColorPicker label="H3 左ボーダーカラー" value={theme.h3LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h3LeftBorderColor', v)} allowOff />
                    <ColorPicker label="H3 下ボーダーカラー" value={theme.h3BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h3BottomBorderColor', v)} allowOff />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <ColorPicker label="H4 テキストカラー" value={theme.h4Color} onChange={(v) => updateTheme('h4Color', v)} />
                    <ColorPicker label="H4 背景色" value={theme.h4BackgroundColor || 'transparent'} onChange={(v) => updateTheme('h4BackgroundColor', v)} allowOff />
                    <ColorPicker label="H4 左ボーダーカラー" value={theme.h4LeftBorderColor || 'transparent'} onChange={(v) => updateTheme('h4LeftBorderColor', v)} allowOff />
                    <ColorPicker label="H4 下ボーダーカラー" value={theme.h4BottomBorderColor || 'transparent'} onChange={(v) => updateTheme('h4BottomBorderColor', v)} allowOff />
                  </div>
                </div>
              )}

              {/* CSSタブ */}
              {activeTab === 'css' && (
                <div>
                  <FloatingInput
                    label="カスタムCSS"
                    value={theme.customCss || ''}
                    onChange={(v) => updateTheme('customCss', v)}
                    placeholder="例: .article-content p { line-height: 1.8; }"
                    multiline
                    rows={16}
                  />
                </div>
              )}
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
