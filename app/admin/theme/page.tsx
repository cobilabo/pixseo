'use client';

import { useState, useEffect } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme, THEME_LAYOUTS, ThemeLayoutId, FooterBlock, FooterContent, FooterTextLink, FooterTextLinkSection, ScriptItem } from '@/types/theme';
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
  const [activeTab, setActiveTab] = useState<'fv' | 'banner' | 'footer-content' | 'footer-section' | 'menu' | 'sns' | 'color' | 'css' | 'js'>('fv');

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
      const fetchedTheme = data.theme || {};
      // デフォルト値とマージ
      setTheme({
        ...defaultTheme,
        ...fetchedTheme,
        menuSettings: {
          ...defaultTheme.menuSettings,
          ...fetchedTheme.menuSettings,
          customMenus: fetchedTheme.menuSettings?.customMenus || defaultTheme.menuSettings?.customMenus || [],
        },
        snsSettings: {
          ...fetchedTheme.snsSettings,
        },
      });
    } catch (error) {
      console.error('テーマ設定の取得に失敗しました:', error);
      setTheme(defaultTheme);
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

  // メニュー設定関連の関数
  const updateMenuLabel = (field: 'topLabel' | 'articlesLabel' | 'searchLabel', value: string) => {
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: field === 'topLabel' ? value : prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: field === 'articlesLabel' ? value : prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: field === 'searchLabel' ? value : prev.menuSettings?.searchLabel || '検索',
        customMenus: prev.menuSettings?.customMenus || Array(5).fill({ label: '', url: '' }),
      },
    }));
  };

  const updateCustomMenu = (index: number, field: 'label' | 'url', value: string) => {
    const customMenus = [...(theme.menuSettings?.customMenus || Array(5).fill({ label: '', url: '' }))];
    customMenus[index] = { ...customMenus[index], [field]: value };
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: prev.menuSettings?.searchLabel || '検索',
        customMenus,
      },
    }));
  };

  // FV設定関連の関数
  const updateFirstView = (field: 'imageUrl' | 'catchphrase' | 'description', value: string) => {
    setTheme(prev => ({
      ...prev,
      firstView: {
        imageUrl: field === 'imageUrl' ? value : prev.firstView?.imageUrl || '',
        catchphrase: field === 'catchphrase' ? value : prev.firstView?.catchphrase || '',
        description: field === 'description' ? value : prev.firstView?.description || '',
      },
    }));
  };

  // スクリプト設定関連の関数
  const addScript = () => {
    const newScript: ScriptItem = {
      id: `script_${Date.now()}`,
      name: '',
      code: '',
      position: 'head',
      device: 'all',
      isEnabled: true,
      isTest: false,
    };
    setTheme(prev => ({
      ...prev,
      scripts: [...(prev.scripts || []), newScript],
    }));
  };

  const updateScript = (index: number, field: keyof ScriptItem, value: string | boolean) => {
    const newScripts = [...(theme.scripts || [])];
    if (newScripts[index]) {
      newScripts[index] = { ...newScripts[index], [field]: value };
      setTheme(prev => ({ ...prev, scripts: newScripts }));
    }
  };

  const removeScript = (index: number) => {
    const newScripts = (theme.scripts || []).filter((_, i) => i !== index);
    setTheme(prev => ({ ...prev, scripts: newScripts }));
  };

  const moveScript = (index: number, direction: 'up' | 'down') => {
    const scripts = [...(theme.scripts || [])];
    if (direction === 'up' && index > 0) {
      [scripts[index - 1], scripts[index]] = [scripts[index], scripts[index - 1]];
    } else if (direction === 'down' && index < scripts.length - 1) {
      [scripts[index], scripts[index + 1]] = [scripts[index + 1], scripts[index]];
    }
    setTheme(prev => ({ ...prev, scripts }));
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
                  onClick={() => setActiveTab('fv')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'fv'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === 'fv' ? { backgroundColor: '#f9fafb' } : {}}
                >
                  FV
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('banner')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'banner'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === 'banner' ? { backgroundColor: '#f9fafb' } : {}}
                >
                  バナーエリア
                </button>
                {theme.layoutTheme === 'cobi' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('footer-content')}
                      className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                        activeTab === 'footer-content'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      style={activeTab === 'footer-content' ? { backgroundColor: '#f9fafb' } : {}}
                    >
                      フッターコンテンツ
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('footer-section')}
                      className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                        activeTab === 'footer-section'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      style={activeTab === 'footer-section' ? { backgroundColor: '#f9fafb' } : {}}
                    >
                      フッターセクション
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'menu'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === 'menu' ? { backgroundColor: '#f9fafb' } : {}}
                >
                  メニュー
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sns')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'sns'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === 'sns' ? { backgroundColor: '#f9fafb' } : {}}
                >
                  SNS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('color')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'color'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === 'color' ? { backgroundColor: '#f9fafb' } : {}}
                >
                  カラー
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('css')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'css'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === 'css' ? { backgroundColor: '#f9fafb' } : {}}
                >
                  CSS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('js')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'js'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === 'js' ? { backgroundColor: '#f9fafb' } : {}}
                >
                  JavaScript
                </button>
              </div>
            </div>

            {/* タブコンテンツ */}
            <div className="p-8">
              {/* FVタブ */}
              {activeTab === 'fv' && (
                <div className="space-y-6">
                  <FeaturedImageUpload
                    value={theme.firstView?.imageUrl || ''}
                    onChange={(url) => updateFirstView('imageUrl', url)}
                    label="FV画像"
                  />
                  
                  <FloatingInput
                    label="キャッチコピー"
                    value={theme.firstView?.catchphrase || ''}
                    onChange={(value) => updateFirstView('catchphrase', value)}
                  />
                  
                  <FloatingInput
                    label="ディスクリプション"
                    value={theme.firstView?.description || ''}
                    onChange={(value) => updateFirstView('description', value)}
                    multiline
                    rows={3}
                  />
                </div>
              )}

              {/* バナーエリアタブ */}
              {activeTab === 'banner' && (
                <div className="grid grid-cols-2 gap-8">
                  {[0, 1, 2, 3].map((index) => {
                    const block = theme.footerBlocks?.[index] || { imageUrl: '', alt: '', linkUrl: '' };
                    const hasImage = Boolean(block.imageUrl);
                    
                    return (
                      <div key={index} className="space-y-4">
                        <FeaturedImageUpload
                          value={block.imageUrl}
                          onChange={(url) => updateFooterBlock(index, 'imageUrl', url)}
                          label={`バナー ${index + 1}`}
                        />
                        {hasImage && (
                          <FloatingInput
                            label="リンク先URL"
                            value={block.linkUrl}
                            onChange={(value) => updateFooterBlock(index, 'linkUrl', value)}
                            type="url"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* フッターコンテンツタブ (cobi テーマ専用) */}
              {activeTab === 'footer-content' && (
                <div className="grid grid-cols-2 gap-8">
                  {[0, 1].map((index) => {
                    const content = theme.footerContents?.[index] || { imageUrl: '', alt: '', title: '', description: '', linkUrl: '' };
                    const hasImage = Boolean(content.imageUrl);
                    
                    return (
                      <div key={index} className="space-y-4">
                        <FeaturedImageUpload
                          value={content.imageUrl}
                          onChange={(url) => updateFooterContent(index, 'imageUrl', url)}
                          label={`コンテンツ ${index + 1}`}
                        />
                        {hasImage && (
                          <>
                            <FloatingInput
                              label="タイトル"
                              value={content.title}
                              onChange={(value) => updateFooterContent(index, 'title', value)}
                            />
                            <FloatingInput
                              label="説明"
                              value={content.description}
                              onChange={(value) => updateFooterContent(index, 'description', value)}
                              multiline
                              rows={3}
                            />
                            <FloatingInput
                              label="リンク先URL"
                              value={content.linkUrl}
                              onChange={(value) => updateFooterContent(index, 'linkUrl', value)}
                              type="url"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* フッターセクションタブ (cobi テーマ専用) */}
              {activeTab === 'footer-section' && (
                <div className="space-y-8">
                  {[0, 1].map((sectionIndex) => {
                    const section = theme.footerTextLinkSections?.[sectionIndex] || { title: '', links: [] };
                    
                    return (
                      <div key={sectionIndex}>
                        {sectionIndex === 1 && (
                          <div className="border-t border-gray-200 -mt-4 mb-4" />
                        )}
                        <div className="space-y-4">
                          <FloatingInput
                            label={`セクションタイトル ${sectionIndex + 1}`}
                            value={section.title}
                            onChange={(value) => updateTextLinkSection(sectionIndex, 'title', value)}
                          />
                          {[0, 1, 2, 3, 4].map((linkIndex) => {
                            const link = section.links?.[linkIndex] || { text: '', url: '' };
                            
                            return (
                              <div key={linkIndex} className="grid grid-cols-2 gap-4">
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
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* メニュータブ */}
              {activeTab === 'menu' && (
                <div className="space-y-4">
                  {/* 基本メニュー */}
                  <FloatingInput
                    label="トップ"
                    value={theme.menuSettings?.topLabel || 'トップ'}
                    onChange={(value) => updateMenuLabel('topLabel', value)}
                  />
                  <FloatingInput
                    label="記事一覧"
                    value={theme.menuSettings?.articlesLabel || '記事一覧'}
                    onChange={(value) => updateMenuLabel('articlesLabel', value)}
                  />
                  <FloatingInput
                    label="検索"
                    value={theme.menuSettings?.searchLabel || '検索'}
                    onChange={(value) => updateMenuLabel('searchLabel', value)}
                  />

                  {/* 追加メニュー */}
                  {[0, 1, 2, 3, 4].map((index) => {
                    const menu = theme.menuSettings?.customMenus?.[index] || { label: '', url: '' };
                    return (
                      <div key={index} className="grid grid-cols-2 gap-4">
                        <FloatingInput
                          label={`追加メニュー ${index + 1} - 表示名`}
                          value={menu.label}
                          onChange={(value) => updateCustomMenu(index, 'label', value)}
                        />
                        <FloatingInput
                          label={`追加メニュー ${index + 1} - URL`}
                          value={menu.url}
                          onChange={(value) => updateCustomMenu(index, 'url', value)}
                          type="url"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SNSタブ */}
              {activeTab === 'sns' && (
                <div className="space-y-4">
                  <FloatingInput
                    label="X（Twitter）ユーザーID"
                    value={theme.snsSettings?.xUserId || ''}
                    onChange={(value) => setTheme(prev => ({
                      ...prev,
                      snsSettings: {
                        ...prev.snsSettings,
                        xUserId: value,
                      }
                    }))}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    ※ 未入力の場合、サイドバーにX（Twitter）タイムラインは表示されません
                  </p>
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
                    <ColorPicker label="メニュー背景色" value={theme.menuBackgroundColor} onChange={(v) => updateTheme('menuBackgroundColor', v)} />
                    <ColorPicker label="メニューテキストカラー" value={theme.menuTextColor} onChange={(v) => updateTheme('menuTextColor', v)} />
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

                </div>
              )}

              {/* CSSタブ */}
              {activeTab === 'css' && (
                <div>
                  <FloatingInput
                    label="カスタムCSS（例：.article-content p { line-height:1.8; }）"
                    value={theme.customCss || ''}
                    onChange={(v) => updateTheme('customCss', v)}
                    multiline
                    rows={16}
                  />
                </div>
              )}

              {/* JavaScriptタブ */}
              {activeTab === 'js' && (
                <div className="space-y-6">
                  {/* 説明 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">スクリプト設定について</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-600">
                          <li>Google Analytics、GTMなどの外部タグを設定できます</li>
                          <li>テストモードを有効にすると、URLに <code className="bg-blue-100 px-1 rounded">?script_test=1</code> を付けた場合のみ実行されます</li>
                          <li>スクリプトは上から順に読み込まれます（並び替え可能）</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* スクリプト一覧 */}
                  {(theme.scripts || []).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <p className="text-gray-500 mb-4">スクリプトが設定されていません</p>
                      <button
                        type="button"
                        onClick={addScript}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        スクリプトを追加
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(theme.scripts || []).map((script, index) => (
                        <div key={script.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          {/* ヘッダー */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              <input
                                type="text"
                                value={script.name}
                                onChange={(e) => updateScript(index, 'name', e.target.value)}
                                placeholder="スクリプト名（例：GA4）"
                                className="text-lg font-medium bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              {/* 並び替えボタン */}
                              <button
                                type="button"
                                onClick={() => moveScript(index, 'up')}
                                disabled={index === 0}
                                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="上に移動"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => moveScript(index, 'down')}
                                disabled={index === (theme.scripts?.length || 0) - 1}
                                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="下に移動"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {/* 削除ボタン */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('このスクリプトを削除しますか？')) {
                                    removeScript(index);
                                  }
                                }}
                                className="p-1.5 text-red-400 hover:text-red-600"
                                title="削除"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* コード入力 */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              スクリプトコード
                            </label>
                            <textarea
                              value={script.code}
                              onChange={(e) => updateScript(index, 'code', e.target.value)}
                              placeholder="<script>...</script> または JavaScript コードを入力"
                              rows={6}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-white"
                            />
                          </div>

                          {/* 設定オプション */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* 設置位置 */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">設置位置</label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { value: 'head', label: '<head>' },
                                  { value: 'body', label: '<body>末尾' },
                                  { value: 'both', label: '両方' },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => updateScript(index, 'position', option.value)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                      script.position === option.value
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* デバイス */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">対象デバイス</label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { value: 'all', label: 'すべて' },
                                  { value: 'pc', label: 'PCのみ' },
                                  { value: 'mobile', label: 'モバイルのみ' },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => updateScript(index, 'device', option.value)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                      script.device === option.value
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 状態トグル */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">状態</label>
                              <div className="flex flex-wrap gap-3">
                                {/* 有効/無効 */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={script.isEnabled}
                                      onChange={(e) => updateScript(index, 'isEnabled', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
                                  </div>
                                  <span className="text-sm text-gray-600">有効</span>
                                </label>
                                {/* テストモード */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={script.isTest}
                                      onChange={(e) => updateScript(index, 'isTest', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-orange-500 transition-colors"></div>
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
                                  </div>
                                  <span className="text-sm text-gray-600">テスト</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* テストモードの説明 */}
                          {script.isTest && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>テストモード: URLに <code className="bg-orange-100 px-1 rounded">?script_test=1</code> を付けた場合のみ実行されます</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* 追加ボタン */}
                      <button
                        type="button"
                        onClick={addScript}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        スクリプトを追加
                      </button>
                    </div>
                  )}
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
