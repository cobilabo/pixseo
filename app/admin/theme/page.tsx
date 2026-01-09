'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';
import { Theme, defaultTheme, THEME_LAYOUTS, ThemeLayoutId, ThemeLayoutSettings, FooterBlock, FooterContent, FooterTextLink, FooterTextLinkSection, ScriptItem, ScriptTrigger, ScriptTriggerType, SearchSettings, SideContentHtmlItem, SideContentItem, SideContentItemType, HtmlShortcodeItem, ArticleSettings, InternalLinkStyle, NavigationItem, NavigationItemType } from '@/types/theme';
import { Page } from '@/types/page';
import { Category } from '@/types/article';
import ColorPicker from '@/components/admin/ColorPicker';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import AdminLayout from '@/components/admin/AdminLayout';
import AuthGuard from '@/components/admin/AuthGuard';
import { apiClient, apiGet } from '@/lib/api-client';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ソート可能なメニュー項目コンポーネント
function SortableNavigationItem({ 
  item, 
  pages, 
  categories,
  onUpdate, 
  onRemove 
}: { 
  item: NavigationItem; 
  pages: Page[]; 
  categories: Category[];
  onUpdate: (id: string, updates: Partial<NavigationItem>) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 現在の選択値を決定
  const getCurrentValue = () => {
    if (item.type === 'page' && item.pageId) {
      return `page:${item.pageId}`;
    }
    if (item.type === 'category' && item.categoryId) {
      return `category:${item.categoryId}`;
    }
    return item.type;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
    >
      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* プルダウン選択 */}
      <select
        value={getCurrentValue()}
        onChange={(e) => {
          const value = e.target.value;
          if (value.startsWith('page:')) {
            const pageId = value.replace('page:', '');
            const page = pages.find(p => p.id === pageId);
            onUpdate(item.id, {
              type: 'page',
              pageId,
              pageSlug: page?.slug,
              categoryId: undefined,
              categorySlug: undefined,
              label: page?.title || '',
            });
          } else if (value.startsWith('category:')) {
            const categoryId = value.replace('category:', '');
            const category = categories.find(c => c.id === categoryId);
            onUpdate(item.id, {
              type: 'category',
              categoryId,
              categorySlug: category?.slug,
              pageId: undefined,
              pageSlug: undefined,
              label: category?.name || '',
            });
          } else {
            const type = value as NavigationItemType;
            const defaultLabels = {
              top: 'トップ',
              search: '検索',
            };
            onUpdate(item.id, {
              type,
              pageId: undefined,
              pageSlug: undefined,
              categoryId: undefined,
              categorySlug: undefined,
              label: defaultLabels[type as keyof typeof defaultLabels] || '',
            });
          }
        }}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="top">トップ</option>
        <option value="search">検索</option>
        <optgroup label="固定ページ">
          {pages.map(page => (
            <option key={page.id} value={`page:${page.id}`}>
              {page.title} (/{page.slug})
            </option>
          ))}
        </optgroup>
        <optgroup label="カテゴリー">
          {categories.map(category => (
            <option key={category.id} value={`category:${category.id}`}>
              {category.name}
            </option>
          ))}
        </optgroup>
      </select>

      {/* 表示ラベル入力 */}
      <input
        type="text"
        value={item.label}
        onChange={(e) => onUpdate(item.id, { label: e.target.value })}
        placeholder="表示ラベル"
        className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export default function ThemePage() {
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();

  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fv' | 'banner' | 'footer-content' | 'footer-section' | 'menu' | 'sns' | 'color' | 'css' | 'js' | 'search' | 'side-content' | 'shortcode' | 'article'>('fv');
  
  // 固定ページ一覧
  const [pages, setPages] = useState<Page[]>([]);
  
  // カテゴリー一覧
  const [categories, setCategories] = useState<Category[]>([]);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (currentTenant) {
      fetchThemeSettings();
      fetchPages();
      fetchCategories();
    }
  }, [currentTenant]);
  
  // 固定ページ一覧を取得
  const fetchPages = async () => {
    try {
      const data: Page[] = await apiGet('/api/admin/pages');
      setPages(data.filter(p => p.isPublished).sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('固定ページの取得に失敗しました:', error);
    }
  };
  
  // カテゴリー一覧を取得
  const fetchCategories = async () => {
    try {
      const data: Category[] = await apiGet('/api/admin/categories');
      setCategories(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      console.error('カテゴリーの取得に失敗しました:', error);
    }
  };

  const fetchThemeSettings = async () => {
    try {
      setFetchLoading(true);
      const response = await apiClient.get('/api/admin/theme');
      const data = await response.json();
      const fetchedTheme = data.theme || {};
      
      // 既存のsideContentHtmlItemsを新形式sideContentItemsに移行
      let migratedSideContentItems = fetchedTheme.sideContentItems || [];
      if (migratedSideContentItems.length === 0 && fetchedTheme.sideContentHtmlItems?.length > 0) {
        // 新形式が空で、旧形式にデータがある場合は移行
        const defaultItems: SideContentItem[] = [
          { id: 'default-popular', type: 'popularArticles', isEnabled: true, order: 0, displayCount: 5 },
          { id: 'default-recommended', type: 'recommendedArticles', isEnabled: true, order: 1, displayCount: 5 },
        ];
        // 旧形式のHTMLアイテムを新形式に変換
        const migratedHtmlItems: SideContentItem[] = fetchedTheme.sideContentHtmlItems.map((item: SideContentHtmlItem, index: number) => ({
          id: item.id || `migrated-html-${index}`,
          type: 'html' as const,
          isEnabled: item.isEnabled,
          order: defaultItems.length + index,
          title: item.title,
          htmlCode: item.htmlCode,
        }));
        migratedSideContentItems = [...defaultItems, ...migratedHtmlItems];
      }
      
      // デフォルト値とマージ
      setTheme({
        ...defaultTheme,
        ...fetchedTheme,
        menuSettings: {
          ...defaultTheme.menuSettings,
          ...fetchedTheme.menuSettings,
          navigationItems: fetchedTheme.menuSettings?.navigationItems || [],
          globalNavItems: fetchedTheme.menuSettings?.globalNavItems || [],
          customMenus: fetchedTheme.menuSettings?.customMenus || defaultTheme.menuSettings?.customMenus || [],
        },
        snsSettings: {
          ...fetchedTheme.snsSettings,
        },
        articleSettings: {
          internalLinkStyle: fetchedTheme.articleSettings?.internalLinkStyle || 'text',
        },
        sideContentItems: migratedSideContentItems,
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
      showError('サービスが選択されていません');
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
        showSuccess('デザイン設定を保存しました');
      } else {
        const error = await response.json();
        showError(`エラー: ${error.error || '保存に失敗しました'}`);
      }
    } catch (error) {
      console.error('デザイン設定の保存に失敗しました:', error);
      showError('保存に失敗しました');
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
      articleSettings: currentTheme.articleSettings,
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
        articleSettings: newSettings.articleSettings,
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

  // メニュー設定関連の関数（新形式）
  const addNavigationItem = () => {
    const newItem: NavigationItem = {
      id: `nav-${Date.now()}`,
      type: 'top',
      label: 'トップ',
    };
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: prev.menuSettings?.searchLabel || '検索',
        customMenus: prev.menuSettings?.customMenus || [],
        navigationItems: [...(prev.menuSettings?.navigationItems || []), newItem],
      },
    }));
  };

  const updateNavigationItem = (id: string, updates: Partial<NavigationItem>) => {
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: prev.menuSettings?.searchLabel || '検索',
        customMenus: prev.menuSettings?.customMenus || [],
        navigationItems: (prev.menuSettings?.navigationItems || []).map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      },
    }));
  };

  const removeNavigationItem = (id: string) => {
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: prev.menuSettings?.searchLabel || '検索',
        customMenus: prev.menuSettings?.customMenus || [],
        navigationItems: (prev.menuSettings?.navigationItems || []).filter(item => item.id !== id),
      },
    }));
  };

  const handleNavigationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const items = theme.menuSettings?.navigationItems || [];
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      setTheme(prev => ({
        ...prev,
        menuSettings: {
          ...prev.menuSettings,
          topLabel: prev.menuSettings?.topLabel || 'トップ',
          articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
          searchLabel: prev.menuSettings?.searchLabel || '検索',
          customMenus: prev.menuSettings?.customMenus || [],
          navigationItems: arrayMove(items, oldIndex, newIndex),
        },
      }));
    }
  };

  // グローバルメニュー設定関連の関数
  const addGlobalNavItem = () => {
    const newItem: NavigationItem = {
      id: `global-nav-${Date.now()}`,
      type: 'top',
      label: 'トップ',
    };
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: prev.menuSettings?.searchLabel || '検索',
        customMenus: prev.menuSettings?.customMenus || [],
        navigationItems: prev.menuSettings?.navigationItems || [],
        globalNavItems: [...(prev.menuSettings?.globalNavItems || []), newItem],
      },
    }));
  };

  const updateGlobalNavItem = (id: string, updates: Partial<NavigationItem>) => {
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: prev.menuSettings?.searchLabel || '検索',
        customMenus: prev.menuSettings?.customMenus || [],
        navigationItems: prev.menuSettings?.navigationItems || [],
        globalNavItems: (prev.menuSettings?.globalNavItems || []).map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      },
    }));
  };

  const removeGlobalNavItem = (id: string) => {
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: prev.menuSettings?.searchLabel || '検索',
        customMenus: prev.menuSettings?.customMenus || [],
        navigationItems: prev.menuSettings?.navigationItems || [],
        globalNavItems: (prev.menuSettings?.globalNavItems || []).filter(item => item.id !== id),
      },
    }));
  };

  const handleGlobalNavDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const items = theme.menuSettings?.globalNavItems || [];
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      setTheme(prev => ({
        ...prev,
        menuSettings: {
          ...prev.menuSettings,
          topLabel: prev.menuSettings?.topLabel || 'トップ',
          articlesLabel: prev.menuSettings?.articlesLabel || '記事一覧',
          searchLabel: prev.menuSettings?.searchLabel || '検索',
          customMenus: prev.menuSettings?.customMenus || [],
          navigationItems: prev.menuSettings?.navigationItems || [],
          globalNavItems: arrayMove(items, oldIndex, newIndex),
        },
      }));
    }
  };

  // 後方互換性のための旧メニュー設定関数
  const updateMenuLabel = (field: 'topLabel' | 'articlesLabel' | 'searchLabel', value: string) => {
    setTheme(prev => ({
      ...prev,
      menuSettings: {
        ...prev.menuSettings,
        topLabel: field === 'topLabel' ? value : prev.menuSettings?.topLabel || 'トップ',
        articlesLabel: field === 'articlesLabel' ? value : prev.menuSettings?.articlesLabel || '記事一覧',
        searchLabel: field === 'searchLabel' ? value : prev.menuSettings?.searchLabel || '検索',
        customMenus: prev.menuSettings?.customMenus || Array(5).fill({ label: '', url: '' }),
        navigationItems: prev.menuSettings?.navigationItems || [],
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
        navigationItems: prev.menuSettings?.navigationItems || [],
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
    searchTypes: {
      keywordSearch: true,
      tagSearch: false,
      popularTags: false,
    },
    popularTagsSettings: {
      displayCount: 10,
    },
  };

  // 検索設定の更新（表示ページ）
  const updateSearchDisplayPages = (field: keyof SearchSettings['displayPages'], value: boolean) => {
    setTheme(prev => {
      const currentSettings = prev.searchSettings || defaultSearchSettings;
      return {
        ...prev,
        searchSettings: {
          ...currentSettings,
          displayPages: {
            ...currentSettings.displayPages,
            [field]: value,
          },
        },
      };
    });
  };

  // 検索設定の更新（検索の種類）
  const updateSearchTypes = (field: keyof SearchSettings['searchTypes'], value: boolean) => {
    setTheme(prev => {
      const currentSettings = prev.searchSettings || defaultSearchSettings;
      return {
        ...prev,
        searchSettings: {
          ...currentSettings,
          searchTypes: {
            ...(currentSettings.searchTypes || defaultSearchSettings.searchTypes),
            [field]: value,
          },
        },
      };
    });
  };

  // よく検索されているタグの表示件数を更新
  const updatePopularTagsDisplayCount = (count: number) => {
    setTheme(prev => {
      const currentSettings = prev.searchSettings || defaultSearchSettings;
      return {
        ...prev,
        searchSettings: {
          ...currentSettings,
          popularTagsSettings: {
            ...(currentSettings.popularTagsSettings || defaultSearchSettings.popularTagsSettings),
            displayCount: count,
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

  // サイドコンテンツ項目（新形式）関連の関数
  const getDefaultSideContentItems = (): SideContentItem[] => {
    return [
      { id: 'popular-articles', type: 'popularArticles', isEnabled: true, order: 0, displayCount: 5 },
      { id: 'recommended-articles', type: 'recommendedArticles', isEnabled: true, order: 1, displayCount: 5 },
    ];
  };

  const getSideContentItems = (): SideContentItem[] => {
    // 既存の設定があればそれを使用、なければデフォルト
    if (theme.sideContentItems && theme.sideContentItems.length > 0) {
      return [...theme.sideContentItems].sort((a, b) => a.order - b.order);
    }
    return getDefaultSideContentItems();
  };

  const addSideContentItem = (type: SideContentItemType) => {
    const currentItems = getSideContentItems();
    const newItem: SideContentItem = {
      id: `side-${type}-${Date.now()}`,
      type,
      isEnabled: true,
      order: currentItems.length,
      ...(type === 'popularArticles' || type === 'recommendedArticles' ? { displayCount: 5 } : {}),
      ...(type === 'html' ? { title: '', htmlCode: '' } : {}),
    };
    setTheme(prev => ({
      ...prev,
      sideContentItems: [...currentItems, newItem],
    }));
  };

  const updateSideContentItem = (id: string, updates: Partial<SideContentItem>) => {
    const items = getSideContentItems().map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    setTheme(prev => ({ ...prev, sideContentItems: items }));
  };

  const removeSideContentItem = (id: string) => {
    const items = getSideContentItems().filter(item => item.id !== id);
    // orderを再設定
    items.forEach((item, i) => item.order = i);
    setTheme(prev => ({ ...prev, sideContentItems: items }));
  };

  const moveSideContentItem = (index: number, direction: 'up' | 'down') => {
    const items = getSideContentItems();
    if (direction === 'up' && index > 0) {
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    // orderを再設定
    items.forEach((item, i) => item.order = i);
    setTheme(prev => ({ ...prev, sideContentItems: items }));
  };

  const getSideContentItemLabel = (type: SideContentItemType): string => {
    switch (type) {
      case 'popularArticles': return '人気記事';
      case 'recommendedArticles': return 'おすすめ記事';
      case 'categories': return 'カテゴリー一覧';
      case 'html': return 'HTMLコード';
      default: return '不明';
    }
  };

  const getSideContentItemIcon = (type: SideContentItemType): React.ReactNode => {
    switch (type) {
      case 'popularArticles':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
      case 'recommendedArticles':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
      case 'categories':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
      case 'html':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
      default:
        return null;
    }
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

  // 記事設定のデフォルト値
  const defaultArticleSettings: ArticleSettings = {
    internalLinkStyle: 'text',
  };

  // 記事設定の更新
  const updateArticleSettings = (field: keyof ArticleSettings, value: InternalLinkStyle) => {
    setTheme(prev => ({
      ...prev,
      articleSettings: {
        ...(prev.articleSettings || defaultArticleSettings),
        [field]: value,
      },
    }));
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
                  onClick={() => setActiveTab('article')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'article'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={activeTab === 'article' ? { backgroundColor: '#f9fafb' } : {}}
                >
                  記事設定
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
                <div className="space-y-6">
                  {/* グローバルメニュー設定 */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-green-700">
                        <p className="font-medium mb-1">グローバルメニュー設定</p>
                        <p className="text-green-600">
                          ヘッダー下のカテゴリーバー位置に表示される項目を設定します。設定すると、カテゴリー一覧の代わりにこのメニューが表示されます。ドラッグ＆ドロップで順番を入れ替えられます。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* グローバルナビゲーション項目一覧 */}
                  <div className="space-y-3">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleGlobalNavDragEnd}
                    >
                      <SortableContext
                        items={(theme.menuSettings?.globalNavItems || []).map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {(theme.menuSettings?.globalNavItems || []).map((item) => (
                          <SortableNavigationItem
                            key={item.id}
                            item={item}
                            pages={pages}
                            categories={categories}
                            onUpdate={updateGlobalNavItem}
                            onRemove={removeGlobalNavItem}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>

                    {/* 項目がない場合 */}
                    {(!theme.menuSettings?.globalNavItems || theme.menuSettings.globalNavItems.length === 0) && (
                      <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                        グローバルメニュー項目がありません。下のボタンから追加してください。
                      </div>
                    )}
                  </div>

                  {/* 追加ボタン */}
                  <button
                    type="button"
                    onClick={addGlobalNavItem}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    グローバルメニュー項目を追加
                  </button>

                  {/* ハンバーガーメニュー設定 */}
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-700">
                          <p className="font-medium mb-1">ハンバーガーメニュー設定</p>
                          <p className="text-blue-600">
                            サイトのハンバーガーメニューに表示する項目を設定します。ドラッグ＆ドロップで順番を入れ替えられます。
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ナビゲーション項目一覧 */}
                    <div className="space-y-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleNavigationDragEnd}
                      >
                        <SortableContext
                          items={(theme.menuSettings?.navigationItems || []).map(item => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {(theme.menuSettings?.navigationItems || []).map((item) => (
                            <SortableNavigationItem
                              key={item.id}
                              item={item}
                              pages={pages}
                              categories={categories}
                              onUpdate={updateNavigationItem}
                              onRemove={removeNavigationItem}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>

                      {/* 項目がない場合 */}
                      {(!theme.menuSettings?.navigationItems || theme.menuSettings.navigationItems.length === 0) && (
                        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                          メニュー項目がありません。下のボタンから追加してください。
                        </div>
                      )}
                    </div>

                    {/* 追加ボタン */}
                    <button
                      type="button"
                      onClick={addNavigationItem}
                      className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      ハンバーガーメニュー項目を追加
                    </button>
                  </div>
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

              {/* 記事設定タブ */}
              {activeTab === 'article' && (
                <div className="space-y-8">
                  {/* 説明 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">記事設定</p>
                        <p className="text-blue-600">
                          記事ページの表示に関する設定を行います。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 内部記事リンクの表示形式 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">内部記事リンクの表示形式</label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { 
                          value: 'text', 
                          label: 'テキストリンク形式', 
                          icon: '🔗', 
                          description: '通常のテキストリンクとして表示',
                          preview: (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                              <p className="text-sm text-gray-700">
                                詳しくは<span className="text-blue-600 underline">こちらの記事</span>をご覧ください。
                              </p>
                            </div>
                          )
                        },
                        { 
                          value: 'blogcard', 
                          label: 'ブログカード形式', 
                          icon: '📰', 
                          description: 'サムネイル・タイトル・説明付きカードで表示',
                          preview: (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-20 h-14 bg-gray-300 rounded flex-shrink-0 flex items-center justify-center">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">記事タイトル</p>
                                  <p className="text-xs text-gray-500 truncate">ライター名</p>
                                  <p className="text-xs text-gray-600 line-clamp-1">記事の説明文...</p>
                                </div>
                              </div>
                            </div>
                          )
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateArticleSettings('internalLinkStyle', option.value as InternalLinkStyle)}
                          className={`flex-1 min-w-[280px] p-4 rounded-xl border-2 transition-all text-left ${
                            (theme.articleSettings?.internalLinkStyle || 'text') === option.value
                              ? 'bg-blue-50 text-blue-700 border-blue-500'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{option.icon}</span>
                            <span className="font-medium">{option.label}</span>
                          </div>
                          <p className="text-xs text-gray-500">{option.description}</p>
                          {option.preview}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 補足説明 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-1">内部記事リンクについて</p>
                        <ul className="text-gray-600 space-y-1">
                          <li>• 記事内の同一サイト内へのリンクが対象となります</li>
                          <li>• 外部サイトへのリンクはテキストリンクのまま表示されます</li>
                          <li>• ブログカード形式ではリンク先の記事情報（画像、タイトル、ライター、説明）が表示されます</li>
                        </ul>
                      </div>
                    </div>
                  </div>
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
                            onChange={(e) => updateSearchDisplayPages(key as keyof SearchSettings['displayPages'], e.target.checked)}
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

                  {/* 検索の種類 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">検索の種類</label>
                    <p className="text-sm text-gray-500 mb-4">表示する検索機能を選択してください（複数選択可）</p>
                    <div className="space-y-3">
                      {[
                        { key: 'keywordSearch', label: 'キーワード検索', icon: '🔍', description: '記事タイトル・内容を検索' },
                        { key: 'tagSearch', label: 'タグ検索（プルダウン）', icon: '🏷️', description: 'タグから関連記事を表示' },
                        { key: 'popularTags', label: 'よく検索されているタグ', icon: '🔥', description: '直近1ヶ月でよく検索されたタグを表示' },
                      ].map(({ key, label, icon, description }) => (
                        <label
                          key={key}
                          className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={theme.searchSettings?.searchTypes?.[key as keyof SearchSettings['searchTypes']] ?? (key === 'keywordSearch')}
                            onChange={(e) => updateSearchTypes(key as keyof SearchSettings['searchTypes'], e.target.checked)}
                            className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{icon}</span>
                              <span className="font-medium text-gray-900">{label}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* よく検索されているタグの表示件数 */}
                  {theme.searchSettings?.searchTypes?.popularTags && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <label className="block text-sm font-medium text-orange-700 mb-3">
                        よく検索されているタグの表示件数
                      </label>
                      <select
                        value={theme.searchSettings?.popularTagsSettings?.displayCount || 10}
                        onChange={(e) => updatePopularTagsDisplayCount(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-orange-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        {[5, 10, 15, 20, 30].map(num => (
                          <option key={num} value={num}>{num}件</option>
                        ))}
                      </select>
                      <p className="text-xs text-orange-600 mt-2">
                        直近1ヶ月の検索履歴から、検索回数が多いタグを上位から表示します
                      </p>
                    </div>
                  )}

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
                        <p className="font-medium mb-1">サイドコンテンツ設定</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-600">
                          <li>サイドバーに表示するコンテンツを設定できます</li>
                          <li>人気記事、おすすめ記事、カテゴリー一覧、HTMLコードを追加できます</li>
                          <li>項目の順番を変更して表示順を制御できます</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* サイドコンテンツ項目一覧 */}
                  <div className="space-y-4">
                    {getSideContentItems().map((item, index) => (
                      <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* ヘッダー */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              item.type === 'popularArticles' ? 'bg-orange-100 text-orange-600' :
                              item.type === 'recommendedArticles' ? 'bg-yellow-100 text-yellow-600' :
                              item.type === 'categories' ? 'bg-green-100 text-green-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {getSideContentItemIcon(item.type)}
                            </span>
                            <span className="text-gray-900 font-medium">
                              {item.type === 'html' ? (item.title || 'HTMLコード') : getSideContentItemLabel(item.type)}
                            </span>
                            {!item.isEnabled && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">無効</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveSideContentItem(index, 'up')}
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
                              onClick={() => moveSideContentItem(index, 'down')}
                              disabled={index === getSideContentItems().length - 1}
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
                                if (confirm('このコンテンツを削除しますか？')) {
                                  removeSideContentItem(item.id);
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
                          {/* 人気記事・おすすめ記事の場合：表示件数 */}
                          {(item.type === 'popularArticles' || item.type === 'recommendedArticles') && (
                            <div className="flex items-center gap-4">
                              <label className="text-sm font-medium text-gray-700">表示件数</label>
                              <select
                                value={item.displayCount || 5}
                                onChange={(e) => updateSideContentItem(item.id, { displayCount: parseInt(e.target.value) })}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              >
                                {[3, 5, 10, 15, 20].map(num => (
                                  <option key={num} value={num} className="text-gray-900">{num}件</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* HTMLの場合：タイトルとコード */}
                          {item.type === 'html' && (
                            <>
                              <FloatingInput
                                label="管理用タイトル"
                                value={item.title || ''}
                                onChange={(value) => updateSideContentItem(item.id, { title: value })}
                              />
                              <FloatingInput
                                label="HTMLコード"
                                value={item.htmlCode || ''}
                                onChange={(value) => updateSideContentItem(item.id, { htmlCode: value })}
                                multiline
                                rows={8}
                              />
                            </>
                          )}

                          {/* 有効/無効トグル */}
                          <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors w-fit">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={item.isEnabled}
                                onChange={(e) => updateSideContentItem(item.id, { isEnabled: e.target.checked })}
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
                  </div>

                  {/* 追加ボタン群 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {!getSideContentItems().some(item => item.type === 'popularArticles') && (
                      <button
                        type="button"
                        onClick={() => addSideContentItem('popularArticles')}
                        className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                      >
                        {getSideContentItemIcon('popularArticles')}
                        <span className="text-sm font-medium">人気記事</span>
                      </button>
                    )}
                    {!getSideContentItems().some(item => item.type === 'recommendedArticles') && (
                      <button
                        type="button"
                        onClick={() => addSideContentItem('recommendedArticles')}
                        className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 transition-all"
                      >
                        {getSideContentItemIcon('recommendedArticles')}
                        <span className="text-sm font-medium">おすすめ記事</span>
                      </button>
                    )}
                    {!getSideContentItems().some(item => item.type === 'categories') && (
                      <button
                        type="button"
                        onClick={() => addSideContentItem('categories')}
                        className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all"
                      >
                        {getSideContentItemIcon('categories')}
                        <span className="text-sm font-medium">カテゴリー一覧</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => addSideContentItem('html')}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      {getSideContentItemIcon('html')}
                      <span className="text-sm font-medium">HTMLコード</span>
                    </button>
                  </div>
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
