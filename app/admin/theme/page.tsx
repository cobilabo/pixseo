'use client';

import { useState, useEffect } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme, THEME_LAYOUTS, ThemeLayoutId, ThemeLayoutSettings, FooterBlock, FooterContent, FooterTextLink, FooterTextLinkSection, ScriptItem, ScriptTrigger, ScriptTriggerType, SearchSettings, SearchBoxType, SideContentHtmlItem, HtmlShortcodeItem } from '@/types/theme';
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
  const [activeTab, setActiveTab] = useState<'fv' | 'banner' | 'footer-content' | 'footer-section' | 'menu' | 'sns' | 'color' | 'css' | 'js' | 'search' | 'side-content' | 'shortcode'>('fv');

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
      
      // 保存前に現在のテーマ設定をthemeSettingsに保存
      const currentSettings = extractCurrentLayoutSettings(theme);
      const themeToSave: Theme = {
        ...theme,
        themeSettings: {
          ...theme.themeSettings,
          [theme.layoutTheme]: currentSettings,
        },
      };
      
      const response = await apiClient.put('/api/admin/theme', { theme: themeToSave });
      
      if (response.ok) {
        // 保存成功時に state も更新
        setTheme(themeToSave);
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

  // 現在のテーマ設定を抽出（themeSettings用）
  const extractCurrentLayoutSettings = (currentTheme: Theme): ThemeLayoutSettings => {
    return {
      firstView: currentTheme.firstView,
      footerBlocks: currentTheme.footerBlocks,
      footerContents: currentTheme.footerContents,
      footerTextLinkSections: currentTheme.footerTextLinkSections,
      menuSettings: currentTheme.menuSettings,
      snsSettings: currentTheme.snsSettings,
      searchSettings: currentTheme.searchSettings,
      sideContentHtmlItems: currentTheme.sideContentHtmlItems,
      htmlShortcodes: currentTheme.htmlShortcodes,
      primaryColor: currentTheme.primaryColor,
      secondaryColor: currentTheme.secondaryColor,
      accentColor: currentTheme.accentColor,
      backgroundColor: currentTheme.backgroundColor,
      headerBackgroundColor: currentTheme.headerBackgroundColor,
      footerBackgroundColor: currentTheme.footerBackgroundColor,
      blockBackgroundColor: currentTheme.blockBackgroundColor,
      menuBackgroundColor: currentTheme.menuBackgroundColor,
      menuTextColor: currentTheme.menuTextColor,
      linkColor: currentTheme.linkColor,
      linkHoverColor: currentTheme.linkHoverColor,
      borderColor: currentTheme.borderColor,
      shadowColor: currentTheme.shadowColor,
      customCss: currentTheme.customCss,
      scripts: currentTheme.scripts,
    };
  };

  // テーマレイアウト切り替え処理
  const handleLayoutThemeChange = (newLayoutTheme: ThemeLayoutId) => {
    setTheme(prev => {
      const currentLayoutTheme = prev.layoutTheme;
      
      // 現在の設定を保存
      const currentSettings = extractCurrentLayoutSettings(prev);
      const updatedThemeSettings = {
        ...prev.themeSettings,
        [currentLayoutTheme]: currentSettings,
      };
      
      // 新しいテーマの設定を取得（保存されていればそれを使用、なければデフォルト）
      const newSettings = updatedThemeSettings[newLayoutTheme] || extractCurrentLayoutSettings(defaultTheme);
      
      return {
        ...prev,
        layoutTheme: newLayoutTheme,
        themeSettings: updatedThemeSettings,
        // 新しいテーマの設定を適用
        firstView: newSettings.firstView,
        footerBlocks: newSettings.footerBlocks,
        footerContents: newSettings.footerContents,
        footerTextLinkSections: newSettings.footerTextLinkSections,
        menuSettings: newSettings.menuSettings || defaultTheme.menuSettings,
        snsSettings: newSettings.snsSettings,
        searchSettings: newSettings.searchSettings,
        sideContentHtmlItems: newSettings.sideContentHtmlItems,
        htmlShortcodes: newSettings.htmlShortcodes,
        primaryColor: newSettings.primaryColor || defaultTheme.primaryColor,
        secondaryColor: newSettings.secondaryColor || defaultTheme.secondaryColor,
        accentColor: newSettings.accentColor || defaultTheme.accentColor,
        backgroundColor: newSettings.backgroundColor || defaultTheme.backgroundColor,
        headerBackgroundColor: newSettings.headerBackgroundColor || defaultTheme.headerBackgroundColor,
        footerBackgroundColor: newSettings.footerBackgroundColor || defaultTheme.footerBackgroundColor,
        blockBackgroundColor: newSettings.blockBackgroundColor || defaultTheme.blockBackgroundColor,
        menuBackgroundColor: newSettings.menuBackgroundColor || defaultTheme.menuBackgroundColor,
        menuTextColor: newSettings.menuTextColor || defaultTheme.menuTextColor,
        linkColor: newSettings.linkColor || defaultTheme.linkColor,
        linkHoverColor: newSettings.linkHoverColor || defaultTheme.linkHoverColor,
        borderColor: newSettings.borderColor || defaultTheme.borderColor,
        shadowColor: newSettings.shadowColor || defaultTheme.shadowColor,
        customCss: newSettings.customCss,
        scripts: newSettings.scripts,
      };
    });
  };

  const updateTheme = (key: keyof Theme, value: any) => {
    // layoutThemeの変更は専用ハンドラを使用
    if (key === 'layoutTheme') {
      handleLayoutThemeChange(value as ThemeLayoutId);
      return;
    }
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
      headCode: '',
      bodyCode: '',
      position: 'head',
      device: 'all',
      triggers: [{ type: 'all' }],
      isEnabled: true,
      isTest: false,
    };
    setTheme(prev => ({
      ...prev,
      scripts: [...(prev.scripts || []), newScript],
    }));
  };

  const updateScript = (index: number, field: keyof ScriptItem, value: string | boolean | ScriptTrigger[]) => {
    const newScripts = [...(theme.scripts || [])];
    if (newScripts[index]) {
      const currentScript = newScripts[index];
      let updatedScript = { ...currentScript, [field]: value };
      
      // position変更時のコード引き継ぎ処理
      if (field === 'position') {
        const oldPosition = currentScript.position;
        const newPosition = value as string;
        
        if (oldPosition === 'both' && newPosition === 'head') {
          // 「両方」→「<head>」: headCodeをcodeに引き継ぎ、bodyCodeは保持
          updatedScript.code = currentScript.headCode || '';
          // headCode, bodyCodeはそのまま保持（後で「両方」に戻す時のため）
        } else if (oldPosition === 'both' && newPosition === 'body') {
          // 「両方」→「<body>末尾」: bodyCodeをcodeに引き継ぎ、headCodeは保持
          updatedScript.code = currentScript.bodyCode || '';
          // headCode, bodyCodeはそのまま保持（後で「両方」に戻す時のため）
        } else if (oldPosition === 'head' && newPosition === 'both') {
          // 「<head>」→「両方」: codeをheadCodeに引き継ぎ、bodyCodeは既存値を使用
          updatedScript.headCode = currentScript.code || '';
          // bodyCodeは現在の値をそのまま使用（既に保持されているはず）
          // 明示的に保持する（undefinedでないことを保証）
          if (!updatedScript.bodyCode) {
            updatedScript.bodyCode = currentScript.bodyCode || '';
          }
        } else if (oldPosition === 'body' && newPosition === 'both') {
          // 「<body>末尾」→「両方」: codeをbodyCodeに引き継ぎ、headCodeは既存値を使用
          updatedScript.bodyCode = currentScript.code || '';
          // headCodeは現在の値をそのまま使用（既に保持されているはず）
          // 明示的に保持する（undefinedでないことを保証）
          if (!updatedScript.headCode) {
            updatedScript.headCode = currentScript.headCode || '';
          }
        } else if (oldPosition === 'head' && newPosition === 'body') {
          // 「<head>」→「<body>末尾」: codeはそのまま使用可能だが、headCodeを保持
          updatedScript.headCode = currentScript.code || '';
          updatedScript.code = currentScript.bodyCode || '';
        } else if (oldPosition === 'body' && newPosition === 'head') {
          // 「<body>末尾」→「<head>」: codeはそのまま使用可能だが、bodyCodeを保持
          updatedScript.bodyCode = currentScript.code || '';
          updatedScript.code = currentScript.headCode || '';
        }
      }
      
      newScripts[index] = updatedScript;
      setTheme(prev => ({ ...prev, scripts: newScripts }));
    }
  };

  const addScriptTrigger = (scriptIndex: number) => {
    const newScripts = [...(theme.scripts || [])];
    if (newScripts[scriptIndex]) {
      const triggers = [...(newScripts[scriptIndex].triggers || [])];
      triggers.push({ type: 'all' });
      newScripts[scriptIndex] = { ...newScripts[scriptIndex], triggers };
      setTheme(prev => ({ ...prev, scripts: newScripts }));
    }
  };

  const updateScriptTrigger = (scriptIndex: number, triggerIndex: number, triggerUpdate: Partial<ScriptTrigger>) => {
    const newScripts = [...(theme.scripts || [])];
    if (newScripts[scriptIndex]) {
      // triggersが未定義または空の場合、デフォルト値を設定
      const existingTriggers = newScripts[scriptIndex].triggers;
      const triggers = existingTriggers && existingTriggers.length > 0 
        ? [...existingTriggers] 
        : [{ type: 'all' as ScriptTriggerType }];
      
      // 指定されたインデックスのtriggerを更新（存在しない場合は新規作成）
      if (triggers[triggerIndex]) {
        triggers[triggerIndex] = { ...triggers[triggerIndex], ...triggerUpdate };
      } else {
        triggers[triggerIndex] = { type: 'all', ...triggerUpdate };
      }
      
      newScripts[scriptIndex] = { ...newScripts[scriptIndex], triggers };
      setTheme(prev => ({ ...prev, scripts: newScripts }));
    }
  };

  const removeScriptTrigger = (scriptIndex: number, triggerIndex: number) => {
    const newScripts = [...(theme.scripts || [])];
    if (newScripts[scriptIndex]) {
      const triggers = (newScripts[scriptIndex].triggers || []).filter((_, i) => i !== triggerIndex);
      // 最低1つは残す
      if (triggers.length === 0) {
        triggers.push({ type: 'all' });
      }
      newScripts[scriptIndex] = { ...newScripts[scriptIndex], triggers };
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

  // 検索設定のデフォルト値
  const defaultSearchSettings: SearchSettings = {
    displayPages: {
      topPage: false,
      staticPages: false,
      articlePages: false,
      sidebar: true,
    },
    searchBoxType: 'keyword',
  };

  // 検索設定の更新
  const updateSearchSettings = (field: keyof SearchSettings['displayPages'] | 'searchBoxType', value: boolean | SearchBoxType) => {
    setTheme(prev => {
      const currentSettings = prev.searchSettings || defaultSearchSettings;
      if (field === 'searchBoxType') {
        return {
          ...prev,
          searchSettings: {
            ...currentSettings,
            searchBoxType: value as SearchBoxType,
          },
        };
      }
      return {
        ...prev,
        searchSettings: {
          ...currentSettings,
          displayPages: {
            ...currentSettings.displayPages,
            [field]: value as boolean,
          },
        },
      };
    });
  };

  // サイドコンテンツHTML関連の関数
  const addSideContentHtml = () => {
    const newItem: SideContentHtmlItem = {
      id: `side_html_${Date.now()}`,
      title: '',
      htmlCode: '',
      isEnabled: true,
      order: (theme.sideContentHtmlItems || []).length,
    };
    setTheme(prev => ({
      ...prev,
      sideContentHtmlItems: [...(prev.sideContentHtmlItems || []), newItem],
    }));
  };

  const updateSideContentHtml = (index: number, field: keyof SideContentHtmlItem, value: string | boolean | number) => {
    const items = [...(theme.sideContentHtmlItems || [])];
    if (items[index]) {
      items[index] = { ...items[index], [field]: value };
      setTheme(prev => ({ ...prev, sideContentHtmlItems: items }));
    }
  };

  const removeSideContentHtml = (index: number) => {
    const items = (theme.sideContentHtmlItems || []).filter((_, i) => i !== index);
    // orderを再設定
    items.forEach((item, i) => item.order = i);
    setTheme(prev => ({ ...prev, sideContentHtmlItems: items }));
  };

  const moveSideContentHtml = (index: number, direction: 'up' | 'down') => {
    const items = [...(theme.sideContentHtmlItems || [])];
    if (direction === 'up' && index > 0) {
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    // orderを再設定
    items.forEach((item, i) => item.order = i);
    setTheme(prev => ({ ...prev, sideContentHtmlItems: items }));
  };

  // HTMLショートコード関連の関数
  const addHtmlShortcode = () => {
    const newItem: HtmlShortcodeItem = {
      id: `shortcode_${Date.now()}`,
      label: '',
      htmlCode: '',
    };
    setTheme(prev => ({
      ...prev,
      htmlShortcodes: [...(prev.htmlShortcodes || []), newItem],
    }));
  };

  const updateHtmlShortcode = (index: number, field: keyof HtmlShortcodeItem, value: string) => {
    const items = [...(theme.htmlShortcodes || [])];
    if (items[index]) {
      items[index] = { ...items[index], [field]: value };
      setTheme(prev => ({ ...prev, htmlShortcodes: items }));
    }
  };

  const removeHtmlShortcode = (index: number) => {
    const items = (theme.htmlShortcodes || []).filter((_, i) => i !== index);
    setTheme(prev => ({ ...prev, htmlShortcodes: items }));
  };

  const moveHtmlShortcode = (index: number, direction: 'up' | 'down') => {
    const items = [...(theme.htmlShortcodes || [])];
    if (direction === 'up' && index > 0) {
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    setTheme(prev => ({ ...prev, htmlShortcodes: items }));
  };

  // 発火条件のオプション
  const triggerOptions: { value: ScriptTriggerType; label: string; needsPath?: boolean }[] = [
    { value: 'all', label: 'サイト全体' },
    { value: 'home', label: 'トップページのみ' },
    { value: 'articles', label: '記事ページ全体' },
    { value: 'categories', label: 'カテゴリーページ全体' },
    { value: 'tags', label: 'タグページ全体' },
    { value: 'pages', label: '固定ページ全体' },
    { value: 'search', label: '検索ページ' },
    { value: 'custom', label: 'カスタムパス指定', needsPath: true },
  ];

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
                {theme.layoutTheme === 'furatto' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('search')}
                      className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                        activeTab === 'search'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      style={activeTab === 'search' ? { backgroundColor: '#f9fafb' } : {}}
                    >
                      検索
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('side-content')}
                      className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                        activeTab === 'side-content'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      style={activeTab === 'side-content' ? { backgroundColor: '#f9fafb' } : {}}
                    >
                      サイドコンテンツ
                    </button>
                  </>
                )}
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
                {theme.layoutTheme === 'furatto' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('shortcode')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'shortcode'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={activeTab === 'shortcode' ? { backgroundColor: '#f9fafb' } : {}}
                  >
                    HTMLショートコード
                  </button>
                )}
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

              {/* 検索タブ（ふらっとテーマ専用） */}
              {activeTab === 'search' && (
                <div className="space-y-8">
                  {/* 説明 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">検索機能設定</p>
                        <p className="text-blue-600">
                          検索ボックスの表示場所と検索方法を設定できます。検索ログは日別に集計されます。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 表示対象ページ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">検索ボックスの表示対象ページ</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'topPage', label: 'TOPページ', description: 'トップページのメインコンテンツエリア' },
                        { key: 'staticPages', label: '固定ページ', description: '固定ページのコンテンツエリア' },
                        { key: 'articlePages', label: '記事ページ', description: '記事詳細ページのコンテンツエリア' },
                        { key: 'sidebar', label: 'サイドコンテンツ内', description: 'サイドバーに表示' },
                      ].map(({ key, label, description }) => (
                        <label
                          key={key}
                          className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={theme.searchSettings?.displayPages?.[key as keyof SearchSettings['displayPages']] ?? (key === 'sidebar')}
                            onChange={(e) => updateSearchSettings(key as keyof SearchSettings['displayPages'], e.target.checked)}
                            className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div>
                            <span className="font-medium text-gray-900">{label}</span>
                            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 検索ボックスの種類 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">検索ボックスの種類</label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { value: 'keyword', label: 'キーワード検索', icon: '🔍', description: '記事タイトル・内容を検索' },
                        { value: 'tag', label: 'タグ検索（プルダウン）', icon: '🏷️', description: 'タグから関連記事を表示' },
                        { value: 'both', label: '両方表示', icon: '📑', description: 'キーワード検索とタグ検索を両方表示' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateSearchSettings('searchBoxType', option.value as SearchBoxType)}
                          className={`flex-1 min-w-[200px] p-4 rounded-xl border-2 transition-all text-left ${
                            (theme.searchSettings?.searchBoxType || 'keyword') === option.value
                              ? 'bg-blue-50 text-blue-700 border-blue-500'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{option.icon}</span>
                            <span className="font-medium">{option.label}</span>
                          </div>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 検索ログについての説明 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-1">検索ログの集計について</p>
                        <ul className="text-gray-600 space-y-1">
                          <li>• 検索されたキーワードとタグは日別に集計されます</li>
                          <li>• 同じキーワード/タグは同日内でカウントアップされます</li>
                          <li>• 日を跨ぐと新しい日付のログが作成されます</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* サイドコンテンツタブ（ふらっとテーマ専用） */}
              {activeTab === 'side-content' && (
                <div className="space-y-6">
                  {/* 説明 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">サイドコンテンツHTML設定</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-600">
                          <li>サイドバーの最下部に任意のHTMLコードを表示できます</li>
                          <li>複数のHTMLブロックを追加し、順番を変更できます</li>
                          <li>広告コードやウィジェットの埋め込みに利用できます</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* HTMLアイテム一覧 */}
                  {(theme.sideContentHtmlItems || []).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <p className="text-gray-500 mb-4">HTMLコードが設定されていません</p>
                      <button
                        type="button"
                        onClick={addSideContentHtml}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        HTMLコードを追加
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(theme.sideContentHtmlItems || []).map((item, index) => (
                        <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          {/* ヘッダー */}
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              <span className="text-gray-900 font-medium">
                                {item.title || '名称未設定'}
                              </span>
                              {!item.isEnabled && (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">無効</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveSideContentHtml(index, 'up')}
                                disabled={index === 0}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="上に移動"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSideContentHtml(index, 'down')}
                                disabled={index === (theme.sideContentHtmlItems?.length || 0) - 1}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="下に移動"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('このHTMLコードを削除しますか？')) {
                                    removeSideContentHtml(index);
                                  }
                                }}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="削除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* コンテンツ */}
                          <div className="p-6 space-y-4">
                            {/* タイトル */}
                            <FloatingInput
                              label="管理用タイトル"
                              value={item.title}
                              onChange={(value) => updateSideContentHtml(index, 'title', value)}
                            />

                            {/* HTMLコード */}
                            <FloatingInput
                              label="HTMLコード"
                              value={item.htmlCode}
                              onChange={(value) => updateSideContentHtml(index, 'htmlCode', value)}
                              multiline
                              rows={8}
                            />

                            {/* 有効/無効トグル */}
                            <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors w-fit">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={item.isEnabled}
                                  onChange={(e) => updateSideContentHtml(index, 'isEnabled', e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                              </div>
                              <span className="text-sm text-gray-700 font-medium">有効</span>
                            </label>
                          </div>
                        </div>
                      ))}

                      {/* 追加ボタン */}
                      <button
                        type="button"
                        onClick={addSideContentHtml}
                        className="w-full py-5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        HTMLコードを追加
                      </button>
                    </div>
                  )}
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
                    <div className="space-y-6">
                      {(theme.scripts || []).map((script, index) => {
                        // triggersがない場合のデフォルト値を設定
                        const triggers = script.triggers || [{ type: 'all' as ScriptTriggerType }];
                        
                        return (
                          <div key={script.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* ヘッダー */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </span>
                                <span className="text-gray-900 font-medium">
                                  {script.name || '名称未設定'}
                                </span>
                                {!script.isEnabled && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">無効</span>
                                )}
                                {script.isTest && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">テスト</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveScript(index, 'up')}
                                  disabled={index === 0}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="上に移動"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveScript(index, 'down')}
                                  disabled={index === (theme.scripts?.length || 0) - 1}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="下に移動"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('このスクリプトを削除しますか？')) {
                                      removeScript(index);
                                    }
                                  }}
                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="削除"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* コンテンツ */}
                            <div className="p-6 space-y-6">
                              {/* スクリプト名 */}
                              <FloatingInput
                                label="スクリプト名"
                                value={script.name}
                                onChange={(value) => updateScript(index, 'name', value)}
                              />

                              {/* 設置位置選択 */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">設置位置</label>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { value: 'head', label: '<head> 内', icon: '📄' },
                                    { value: 'body', label: '<body> 末尾', icon: '📃' },
                                    { value: 'both', label: '両方（別々に設定）', icon: '📑' },
                                  ].map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => updateScript(index, 'position', option.value)}
                                      className={`px-4 py-2 text-sm rounded-lg border-2 transition-all ${
                                        script.position === option.value
                                          ? 'bg-blue-50 text-blue-700 border-blue-500 font-medium'
                                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <span className="mr-1.5">{option.icon}</span>
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* コード入力エリア */}
                              {script.position === 'both' ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <FloatingInput
                                    label="<head> 用コード"
                                    value={script.headCode || ''}
                                    onChange={(value) => updateScript(index, 'headCode', value)}
                                    multiline
                                    rows={8}
                                  />
                                  <FloatingInput
                                    label="<body> 末尾用コード"
                                    value={script.bodyCode || ''}
                                    onChange={(value) => updateScript(index, 'bodyCode', value)}
                                    multiline
                                    rows={8}
                                  />
                                </div>
                              ) : (
                                <FloatingInput
                                  label={`スクリプトコード（${script.position === 'head' ? '<head>' : '<body>末尾'} に挿入）`}
                                  value={script.code}
                                  onChange={(value) => updateScript(index, 'code', value)}
                                  multiline
                                  rows={8}
                                />
                              )}

                              {/* 発火条件（複数設定可能） */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <label className="block text-sm font-medium text-gray-700">発火条件（対象ページ）</label>
                                  <span className="text-xs text-gray-500">※ 複数条件はOR（いずれかにマッチ）で評価</span>
                                </div>
                                <div className="space-y-3">
                                  {triggers.map((trigger, triggerIndex) => {
                                    const selectedTriggerOption = triggerOptions.find(o => o.value === trigger.type);
                                    
                                    return (
                                      <div key={triggerIndex} className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                          <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                                条件 {triggerIndex + 1}
                                              </span>
                                              <select
                                                value={trigger.type}
                                                onChange={(e) => updateScriptTrigger(index, triggerIndex, { 
                                                  type: e.target.value as ScriptTriggerType,
                                                  customPaths: [],
                                                })}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                                              >
                                                {triggerOptions.map((option) => (
                                                  <option key={option.value} value={option.value}>
                                                    {option.label}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* カスタムパス入力 */}
                                            {selectedTriggerOption?.needsPath && (
                                              <div>
                                                <FloatingInput
                                                  label="パスパターン（カンマ区切りで複数指定可）"
                                                  value={(trigger.customPaths || []).join(', ')}
                                                  onChange={(value) => {
                                                    const values = value.split(',').map(v => v.trim()).filter(v => v);
                                                    updateScriptTrigger(index, triggerIndex, { customPaths: values });
                                                  }}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                  ※ ワイルドカード（*）使用可。例: /articles/*, /contact, /about
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* 削除ボタン */}
                                          <button
                                            type="button"
                                            onClick={() => removeScriptTrigger(index, triggerIndex)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="この条件を削除"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* 条件追加ボタン */}
                                  <button
                                    type="button"
                                    onClick={() => addScriptTrigger(index)}
                                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1 text-sm"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    発火条件を追加
                                  </button>
                                </div>
                              </div>

                              {/* デバイス・状態設定 */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* デバイス */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-3">対象デバイス</label>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      { value: 'all', label: 'すべて', icon: '🖥️📱' },
                                      { value: 'pc', label: 'PCのみ', icon: '🖥️' },
                                      { value: 'mobile', label: 'モバイルのみ', icon: '📱' },
                                    ].map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => updateScript(index, 'device', option.value)}
                                        className={`px-4 py-2 text-sm rounded-lg border-2 transition-all ${
                                          script.device === option.value
                                            ? 'bg-blue-50 text-blue-700 border-blue-500 font-medium'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                        }`}
                                      >
                                        <span className="mr-1.5">{option.icon}</span>
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* 状態トグル */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-3">状態</label>
                                  <div className="flex flex-wrap gap-4">
                                    {/* 有効/無効 */}
                                    <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={script.isEnabled}
                                          onChange={(e) => updateScript(index, 'isEnabled', e.target.checked)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                                      </div>
                                      <span className="text-sm text-gray-700 font-medium">有効</span>
                                    </label>
                                    {/* テストモード */}
                                    <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={script.isTest}
                                          onChange={(e) => updateScript(index, 'isTest', e.target.checked)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-orange-500 transition-colors"></div>
                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                                      </div>
                                      <span className="text-sm text-gray-700 font-medium">テストモード</span>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              {/* テストモードの説明 */}
                              {script.isTest && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                  <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div className="text-sm text-orange-700">
                                      <p className="font-medium">テストモードが有効です</p>
                                      <p className="mt-1">URLに <code className="bg-orange-100 px-1.5 py-0.5 rounded font-mono">?script_test=1</code> を付けた場合のみスクリプトが実行されます。</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* 追加ボタン */}
                      <button
                        type="button"
                        onClick={addScript}
                        className="w-full py-5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
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

              {/* HTMLショートコードタブ（ふらっとテーマ専用） */}
              {activeTab === 'shortcode' && (
                <div className="space-y-6">
                  {/* 説明 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">HTMLショートコード設定</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-600">
                          <li>記事編集画面のHTML挿入モーダルで呼び出せるショートコードを登録できます</li>
                          <li>よく使うHTMLコードをラベル付きで登録しておくことで、素早く挿入できます</li>
                          <li>広告コード、埋め込みウィジェットなどの登録に便利です</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* ショートコード一覧 */}
                  {(theme.htmlShortcodes || []).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <p className="text-gray-500 mb-4">ショートコードが設定されていません</p>
                      <button
                        type="button"
                        onClick={addHtmlShortcode}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        ショートコードを追加
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(theme.htmlShortcodes || []).map((item, index) => (
                        <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          {/* ヘッダー */}
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              <span className="text-gray-900 font-medium">
                                {item.label || 'ラベル未設定'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveHtmlShortcode(index, 'up')}
                                disabled={index === 0}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="上に移動"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => moveHtmlShortcode(index, 'down')}
                                disabled={index === (theme.htmlShortcodes?.length || 0) - 1}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="下に移動"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('このショートコードを削除しますか？')) {
                                    removeHtmlShortcode(index);
                                  }
                                }}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="削除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* コンテンツ */}
                          <div className="p-6 space-y-4">
                            {/* ラベル */}
                            <FloatingInput
                              label="ラベル（プルダウン表示名）"
                              value={item.label}
                              onChange={(value) => updateHtmlShortcode(index, 'label', value)}
                            />

                            {/* HTMLコード */}
                            <FloatingInput
                              label="HTMLコード"
                              value={item.htmlCode}
                              onChange={(value) => updateHtmlShortcode(index, 'htmlCode', value)}
                              multiline
                              rows={8}
                            />
                          </div>
                        </div>
                      ))}

                      {/* 追加ボタン */}
                      <button
                        type="button"
                        onClick={addHtmlShortcode}
                        className="w-full py-5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        ショートコードを追加
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
