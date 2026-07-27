'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import ColorPicker from '@/components/admin/ColorPicker';
import CustomCheckbox from '@/components/admin/CustomCheckbox';
import { updatePageWithRevision, getPageById, restorePageRevision } from '@/lib/firebase/pages-admin';
import { Page, LayoutMode } from '@/types/page';
import { Block } from '@/types/block';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';
import { apiGet } from '@/lib/api-client';
import BlockBuilder, { BlockBuilderRef } from '@/components/admin/BlockBuilder';
import MediaLibraryModal from '@/components/admin/MediaLibraryModal';
import ContentCompareModal from '@/components/admin/content-compare/ContentCompareModal';
import RevisionHistoryPanel from '@/components/admin/content-compare/RevisionHistoryPanel';
import { PageCompareData, pageSnapshotToCompareData } from '@/components/admin/content-compare/diff-utils';
import { getRevisionById } from '@/lib/firebase/revisions-admin';
import { PageRevision } from '@/types/revision';

export default function EditPagePage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [serpPreviewDevice, setSerpPreviewDevice] = useState<'pc' | 'sp'>('pc');
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [generatingMetaTitle, setGeneratingMetaTitle] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]); // ブロックデータ
  const blockBuilderRef = useRef<BlockBuilderRef>(null);
  const [activeTab, setActiveTab] = useState<'blocks' | 'settings'>('blocks');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    isPublished: false,
    metaTitle: '',
    metaDescription: '',
    order: 0,
    backgroundColor: '',
    textColor: '',
    showPanel: true,
    panelColor: '#ffffff',
    customCss: '',
    layoutMode: 'default' as LayoutMode,
    showGlobalNav: false,
    showSidebar: false,
    isHomePage: false,
    faviconUrl: '',
  });
  const [showFaviconLibrary, setShowFaviconLibrary] = useState(false);
  
  // トップページ設定関連
  const [showHomePageDialog, setShowHomePageDialog] = useState(false);
  const [existingHomePage, setExistingHomePage] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [newSlugForExistingHome, setNewSlugForExistingHome] = useState('');
  const [changingHomeSlug, setChangingHomeSlug] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState<PageCompareData | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareBefore, setCompareBefore] = useState<PageCompareData | null>(null);
  const [compareAfter, setCompareAfter] = useState<PageCompareData | null>(null);
  const [compareBeforeLabel, setCompareBeforeLabel] = useState('編集前');
  const [compareAfterLabel, setCompareAfterLabel] = useState('編集後');
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);

  const getCurrentPageData = (): PageCompareData => {
    const currentBlocks = blockBuilderRef.current?.getCurrentBlocks() || blocks;
    return {
      formData: { ...formData },
      blocks: currentBlocks,
    };
  };

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  const fetchPage = async () => {
    try {
      const page = await getPageById(pageId);
      if (!page) {
        showError('固定ページが見つかりません');
        router.push('/pages');
        return;
      }

      setFormData({
        title: page.title,
        content: page.content,
        excerpt: page.excerpt || '',
        slug: page.slug,
        isPublished: page.isPublished,
        metaTitle: page.metaTitle || '',
        metaDescription: page.metaDescription || '',
        order: page.order,
        backgroundColor: page.backgroundColor || '',
        textColor: page.textColor || '',
        showPanel: page.showPanel !== false, // デフォルトtrue
        panelColor: page.panelColor || '#ffffff',
        customCss: page.customCss || '',
        layoutMode: (page.layoutMode || 'default') as LayoutMode,
        showGlobalNav: page.showGlobalNav || false,
        showSidebar: page.showSidebar || false,
        isHomePage: page.isHomePage || page.slug === 'home',
        faviconUrl: page.faviconUrl || '',
      });
      
      // ブロックビルダーデータを読み込み
      setBlocks(page.blocks || []);
      setOriginalSnapshot(pageSnapshotToCompareData(page));
      
      setFetchLoading(false);
    } catch (error) {
      console.error('Error fetching page:', error);
      showError('固定ページの取得に失敗しました');
      setFetchLoading(false);
    }
  };

  const generateSlugFromTitle = async (title: string) => {
    if (!title.trim()) return;

    setGeneratingSlug(true);
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/pages/generate-slug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('スラッグの生成に失敗しました');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, slug: data.slug }));
    } catch (error) {
      console.error('Error generating slug:', error);
      const fallbackSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
      setFormData(prev => ({ ...prev, slug: fallbackSlug }));
    } finally {
      setGeneratingSlug(false);
    }
  };

  const generateMetaTitle = async () => {
    if (!formData.title) return;

    setGeneratingMetaTitle(true);
    try {
      const response = await fetch('/api/admin/articles/generate-meta-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate meta title');
      }

      const data = await response.json();
      
      if (!formData.metaTitle) {
        setFormData(prev => ({ ...prev, metaTitle: data.metaTitle }));
      }
    } catch (error) {
      console.error('Error generating meta title:', error);
      if (!formData.metaTitle) {
        const fallbackMetaTitle = formData.title.length > 70 
          ? formData.title.substring(0, 67) + '...'
          : formData.title;
        setFormData(prev => ({ ...prev, metaTitle: fallbackMetaTitle }));
      }
    } finally {
      setGeneratingMetaTitle(false);
    }
  };

  // 日本語が含まれているかをチェック
  const containsJapanese = (text: string): boolean => {
    // ひらがな、カタカナ、漢字が含まれているかをチェック
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  };

  // テキストを翻訳（日本語以外の場合はそのまま返す）
  const translateOrKeep = async (
    text: string,
    targetLang: string,
    currentTenantId: string | null
  ): Promise<string> => {
    // 日本語が含まれていない場合は翻訳せず、そのまま返す
    if (!containsJapanese(text)) {
      return text;
    }

    // 日本語が含まれている場合は翻訳
    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify({
          type: 'text',
          targetLang: targetLang,
          data: { text },
        }),
      });
      if (response.ok) {
        const { translated } = await response.json();
        return translated;
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
    return text;
  };

  // トップページ設定のチェック
  const handleHomePageToggle = async (checked: boolean) => {
    if (checked) {
      // 既存のhomeページをチェック
      try {
        const currentTenantId = typeof window !== 'undefined' 
          ? localStorage.getItem('currentTenantId') 
          : null;

        const response = await fetch('/api/admin/pages/check-home', {
          headers: {
            'x-media-id': currentTenantId || '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.exists && data.homePage.id !== pageId) {
            // 既存のhomeページがある場合はダイアログを表示
            setExistingHomePage(data.homePage);
            setNewSlugForExistingHome('');
            setShowHomePageDialog(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking home page:', error);
      }

      // 既存のhomeページがない場合は直接設定
      setFormData(prev => ({ 
        ...prev, 
        isHomePage: true, 
        slug: 'home' 
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        isHomePage: false 
      }));
    }
  };

  // 既存のhomeページのスラッグを変更
  const handleChangeExistingHomeSlug = async () => {
    if (!newSlugForExistingHome.trim()) {
      showError('新しいスラッグを入力してください');
      return;
    }

    if (!existingHomePage) return;

    setChangingHomeSlug(true);
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/pages/check-home', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify({
          pageId: existingHomePage.id,
          newSlug: newSlugForExistingHome.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || 'スラッグの変更に失敗しました');
        return;
      }

      // 成功したらこのページをトップページに設定
      setFormData(prev => ({ 
        ...prev, 
        isHomePage: true, 
        slug: 'home' 
      }));
      setShowHomePageDialog(false);
      setExistingHomePage(null);
    } catch (error) {
      console.error('Error changing home slug:', error);
      showError('スラッグの変更に失敗しました');
    } finally {
      setChangingHomeSlug(false);
    }
  };

  const handleOpenCompare = () => {
    if (!originalSnapshot) return;
    setCompareBefore(originalSnapshot);
    setCompareAfter(getCurrentPageData());
    setCompareBeforeLabel('編集前（保存済み）');
    setCompareAfterLabel('編集中');
    setShowCompare(true);
  };

  const handleRevisionCompare = async (revision: { id: string; label?: string }) => {
    try {
      const rev = await getRevisionById<PageRevision>('page', pageId, revision.id);
      if (!rev) {
        showError('履歴の取得に失敗しました');
        return;
      }
      setCompareBefore(pageSnapshotToCompareData(rev.snapshot));
      setCompareAfter(getCurrentPageData());
      setCompareBeforeLabel(rev.label || '履歴');
      setCompareAfterLabel('現行（編集中）');
      setShowCompare(true);
    } catch (error) {
      console.error('Error loading revision:', error);
      showError('履歴の取得に失敗しました');
    }
  };

  const handleRevisionRestore = async (revision: { id: string; label?: string }) => {
    const label = revision.label || '選択した版';
    if (!confirm(`${label} に戻しますか？\n現在の内容は履歴に保存されます。`)) return;

    setLoading(true);
    try {
      await restorePageRevision(pageId, revision.id);
      await fetchPage();
      setRevisionRefreshKey((k) => k + 1);
      showSuccess('以前の版に復元しました');
    } catch (error) {
      console.error('Error restoring revision:', error);
      showError('復元に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.slug) {
      showError('タイトルとスラッグは必須です');
      return;
    }
    
    // BlockBuilderから現在のブロックを取得
    // ページ設定タブから保存する場合、refがnullになるのでblocksステートを使用
    const currentBlocks = blockBuilderRef.current?.getCurrentBlocks() || blocks;

    if (!currentTenant) {
      showError('メディアテナントが選択されていません');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        ...formData,
        useBlockBuilder: true,
        blocks: currentBlocks,
        // 後方互換性のため、contentも生成して保存
        content: '<!-- Block Builder Content -->',
      };

      // ページとブロックの翻訳
      try {
        const currentTenantId = typeof window !== 'undefined' 
          ? localStorage.getItem('currentTenantId') 
          : null;

        const targetLangs = ['ja', 'en', 'zh', 'ko'];

        // ページ設定の翻訳
        for (const lang of targetLangs) {
          if (formData.title) {
            updateData[`title_${lang}`] = await translateOrKeep(
              formData.title,
              lang,
              currentTenantId
            );
          }

          if (formData.excerpt) {
            updateData[`excerpt_${lang}`] = await translateOrKeep(
              formData.excerpt,
              lang,
              currentTenantId
            );
          }

          if (formData.metaTitle) {
            updateData[`metaTitle_${lang}`] = await translateOrKeep(
              formData.metaTitle,
              lang,
              currentTenantId
            );
          }
        }

        // セクションブロックの翻訳
        updateData.blocks = await Promise.all(
          currentBlocks.map(async (block: any) => {
            if (block.type === 'content') {
              const translatedConfig = { ...block.config };

              for (const lang of targetLangs) {
                // 見出しの翻訳
                if (block.config.heading) {
                  translatedConfig[`heading_${lang}`] = await translateOrKeep(
                    block.config.heading,
                    lang,
                    currentTenantId
                  );
                }

                // テキストの翻訳
                if (block.config.description) {
                  translatedConfig[`description_${lang}`] = await translateOrKeep(
                    block.config.description,
                    lang,
                    currentTenantId
                  );
                }

                // ボタンテキストの翻訳
                if (block.config.buttonText) {
                  translatedConfig[`buttonText_${lang}`] = await translateOrKeep(
                    block.config.buttonText,
                    lang,
                    currentTenantId
                  );
                }

                // ライター肩書きの翻訳
                if (block.config.writers && block.config.writers.length > 0) {
                  translatedConfig.writers = await Promise.all(
                    block.config.writers.map(async (writer: any) => {
                      if (writer.jobTitle) {
                        const translated = await translateOrKeep(
                          writer.jobTitle,
                          lang,
                          currentTenantId
                        );
                        return { ...writer, [`jobTitle_${lang}`]: translated };
                      }
                      return writer;
                    })
                  );
                }

                // ボタンの翻訳
                if (block.config.buttons && block.config.buttons.length > 0) {
                  translatedConfig.buttons = await Promise.all(
                    block.config.buttons.map(async (button: any) => {
                      if (button.text && button.type !== 'image') {
                        const translated = await translateOrKeep(
                          button.text,
                          lang,
                          currentTenantId
                        );
                        return { ...button, [`text_${lang}`]: translated };
                      }
                      return button;
                    })
                  );
                }
              }

              return { ...block, config: translatedConfig };
            }
            return block;
          })
        );
      } catch (error) {
        console.error('Translation error:', error);
        // 翻訳失敗時は元のデータで保存
      }
      
      await updatePageWithRevision(pageId, updateData);

      setOriginalSnapshot({
        formData: { ...formData },
        blocks: updateData.blocks || currentBlocks,
      });
      setRevisionRefreshKey((k) => k + 1);
      showSuccess('固定ページを更新しました');
    } catch (error: any) {
      console.error('Error updating page:', error);
      const msg = error?.message || error?.code || String(error);
      showError(`固定ページの更新に失敗しました: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    if (formData.title) {
      generateSlugFromTitle(formData.title);
    }
  };

  if (fetchLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="px-4 pb-32 animate-fadeIn">
          <div className="mb-6">
            <RevisionHistoryPanel
              entityType="page"
              entityId={pageId}
              onCompare={handleRevisionCompare}
              onRestore={handleRevisionRestore}
              refreshKey={revisionRefreshKey}
            />
          </div>

          <form id="page-edit-form" onSubmit={handleSubmit}>
            {/* タブメニュー */}
            <div className="bg-white rounded-[1.75rem] mb-6">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setActiveTab('blocks')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'blocks'
                        ? 'text-blue-600 border-b-2 border-blue-600 rounded-tl-[1.75rem]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={activeTab === 'blocks' ? { backgroundColor: '#f9fafb' } : {}}
                  >
                    ブロック
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'settings'
                        ? 'text-blue-600 border-b-2 border-blue-600 rounded-tr-[1.75rem]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={activeTab === 'settings' ? { backgroundColor: '#f9fafb' } : {}}
                  >
                    ページ設定
                  </button>
                </div>
              </div>

              {/* ブロックタブ */}
              {activeTab === 'blocks' && (
                <div className="p-6">
                  <BlockBuilder ref={blockBuilderRef} blocks={blocks} onChange={setBlocks} />
                </div>
              )}

              {/* ページ設定タブ */}
              {activeTab === 'settings' && (
                <div className="p-6 space-y-6">
                  {/* タイトル */}
                  <FloatingInput
                label="タイトル"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                required
              />

              {/* トップページとして設定 */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <CustomCheckbox
                  label="トップページとして設定"
                  checked={formData.isHomePage}
                  onChange={handleHomePageToggle}
                />
                <p className="text-xs text-gray-500 mt-2 ml-7">
                  チェックするとこのページがサイトのトップページとして表示されます。スラッグは自動的に「home」に設定されます。
                </p>
              </div>

              {/* スラッグ - 自動生成ボタン付き */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <FloatingInput
                    label="スラッグ（URL）"
                    value={formData.slug}
                    onChange={(value) => setFormData({ ...formData, slug: value, isHomePage: value === 'home' })}
                    required
                    disabled={formData.isHomePage}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateSlug}
                  disabled={generatingSlug || !formData.title || formData.isHomePage}
                  className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 h-12 mb-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingSlug ? '生成中...' : '自動生成'}
                </button>
              </div>


              {/* 表示順 */}
              <FloatingInput
                label="表示順"
                type="number"
                value={formData.order.toString()}
                onChange={(value) => setFormData({ ...formData, order: parseInt(value) || 0 })}
                required
              />

              {/* メタディスクリプション */}
              <FloatingInput
                label="メタディスクリプション"
                value={formData.excerpt}
                onChange={(value) => setFormData({ ...formData, excerpt: value })}
                multiline
                rows={3}
              />

              {/* 背景色 */}
              <ColorPicker
                label="背景色"
                value={formData.backgroundColor}
                onChange={(value) => setFormData({ ...formData, backgroundColor: value })}
              />

              {/* テキストカラー */}
              <ColorPicker
                label="テキストカラー"
                value={formData.textColor}
                onChange={(value) => setFormData({ ...formData, textColor: value })}
              />

              {/* レイアウトモード */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">レイアウトモード</h3>
                <p className="text-xs text-gray-500">ページのレイアウトを選択してください</p>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="layoutMode"
                      value="default"
                      checked={formData.layoutMode === 'default'}
                      onChange={() => setFormData({ ...formData, layoutMode: 'default' })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-sm">通常モード</div>
                      <div className="text-xs text-gray-500">ヘッダー、フッター、サイドバー、Theme CSS が適用されます</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="layoutMode"
                      value="blank"
                      checked={formData.layoutMode === 'blank'}
                      onChange={() => setFormData({ ...formData, layoutMode: 'blank' })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-sm">完全白紙モード</div>
                      <div className="text-xs text-gray-500">BlockBuilder のみで自由に構築（CSS 干渉なし、コーポレートサイト向け）</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 通常モードの場合のみ表示 */}
              {formData.layoutMode === 'default' && (
                <>
                  {/* グローバルナビゲーション表示 */}
                  <CustomCheckbox
                    label="グローバルナビゲーション表示"
                    checked={formData.showGlobalNav}
                    onChange={(checked) => setFormData({ ...formData, showGlobalNav: checked })}
                  />

                  {/* サイドバー表示 */}
                  <CustomCheckbox
                    label="サイドバー表示"
                    checked={formData.showSidebar}
                    onChange={(checked) => setFormData({ ...formData, showSidebar: checked })}
                  />
                </>
              )}

              {/* パネル表示 */}
              <CustomCheckbox
                label="パネル表示"
                checked={formData.showPanel}
                onChange={(checked) => setFormData({ ...formData, showPanel: checked })}
              />

              {/* パネルカラー（パネル表示ONの時のみ） */}
              {formData.showPanel && (
                <ColorPicker
                  label="パネルカラー"
                  value={formData.panelColor}
                  onChange={(value) => setFormData({ ...formData, panelColor: value })}
                />
              )}

              {/* カスタムCSS */}
              <FloatingInput
                label="カスタムCSS（最優先で読み込まれます）"
                value={formData.customCss}
                onChange={(value) => setFormData({ ...formData, customCss: value })}
                multiline
                rows={8}
              />

              {/* ページ専用ファビコン */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">ページ専用ファビコン</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    設定した場合、このページのみサイト共通のファビコンではなくこの画像が表示されます。メディア管理に登録済みの画像から選択してください。
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="relative w-16 h-16 rounded-lg border border-gray-200 bg-white flex-shrink-0 overflow-hidden">
                    {formData.faviconUrl ? (
                      <Image
                        src={formData.faviconUrl}
                        alt="Favicon Preview"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <FloatingInput
                      label="ファビコンURL"
                      value={formData.faviconUrl}
                      onChange={(value) => setFormData({ ...formData, faviconUrl: value })}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowFaviconLibrary(true)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
                      >
                        メディアライブラリから選択
                      </button>
                      {formData.faviconUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, faviconUrl: '' })}
                          className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 text-sm"
                        >
                          クリア
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* メタタイトル */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <FloatingInput
                    label="メタタイトル（SEO用）"
                    value={formData.metaTitle}
                    onChange={(value) => setFormData({ ...formData, metaTitle: value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateMetaTitle}
                  disabled={generatingMetaTitle || !formData.title}
                  className="w-12 h-12 mb-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="メタタイトル自動生成"
                >
                  {generatingMetaTitle ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
                  )}
                </button>
              </div>

                  {/* SERP プレビュー */}
                  <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Google 検索結果プレビュー
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setSerpPreviewDevice('pc')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    serpPreviewDevice === 'pc'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🖥️ PC
                </button>
                <button
                  onClick={() => setSerpPreviewDevice('sp')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    serpPreviewDevice === 'sp'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📱 SP
                </button>
              </div>
            </div>
            
            <div className={`border border-gray-200 rounded-xl p-4 bg-white transition-all ${
              serpPreviewDevice === 'sp' ? 'max-w-sm mx-auto' : ''
            }`}>
              <div className={`text-blue-600 hover:underline cursor-pointer mb-1 ${
                serpPreviewDevice === 'pc' ? 'text-xl' : 'text-base'
              }`}>
                {formData.metaTitle || formData.title || 'タイトルを入力してください'}
              </div>
              <div className={serpPreviewDevice === 'pc' ? 'text-sm mb-2' : 'text-xs mb-1'}>
                <span className="text-green-700">
                  {currentTenant?.slug ? `${currentTenant.slug}.pixseo-preview.cloud` : 'example.pixseo-preview.cloud'} › ja › {formData.slug || 'page-slug'}
                </span>
              </div>
              <div className={`text-gray-600 line-clamp-2 ${
                serpPreviewDevice === 'pc' ? 'text-sm' : 'text-xs'
              }`}>
                {formData.excerpt || 'メタディスクリプションを入力してください。検索結果に表示される説明文です。'}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                <div>
                  タイトル: <span className={`font-medium ${(formData.metaTitle || formData.title || '').length > 60 ? 'text-red-500' : 'text-green-600'}`}>
                    {(formData.metaTitle || formData.title || '').length}
                  </span> / 60文字
                </div>
                <div>
                  説明: <span className={`font-medium ${formData.excerpt.length > 160 ? 'text-red-500' : 'text-green-600'}`}>
                    {formData.excerpt.length}
                  </span> / 160文字
                </div>
              </div>
            </div>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* 公開トグル（固定位置） */}
          <div className="fixed bottom-36 right-8 w-32 z-50">
            <div className="bg-white rounded-full px-6 py-3 shadow-custom">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">公開</span>
                <label className="cursor-pointer">
                  <div className="relative inline-block w-14 h-8">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="sr-only"
                    />
                    <div 
                      className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
                        formData.isPublished ? 'bg-blue-600' : 'bg-gray-400'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        formData.isPublished ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            <button
              type="button"
              onClick={handleOpenCompare}
              className="bg-gray-100 text-gray-700 px-5 h-14 rounded-full hover:bg-gray-200 transition-all hover:scale-105 flex items-center justify-center text-sm font-medium shadow-custom"
              title="変更を比較"
            >
              比較
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center"
              title="キャンセル"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              type="submit"
              disabled={loading}
              form="page-edit-form"
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="固定ページを更新"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* トップページ設定ダイアログ */}
        {showHomePageDialog && existingHomePage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">既存のトップページがあります</h3>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">現在のトップページ:</p>
                <p className="font-medium text-gray-900">{existingHomePage.title}</p>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                このページをトップページに設定するには、既存のトップページのスラッグを変更する必要があります。新しいスラッグを入力してください。
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいスラッグ
                </label>
                <input
                  type="text"
                  value={newSlugForExistingHome}
                  onChange={(e) => setNewSlugForExistingHome(e.target.value)}
                  placeholder="例: old-home, top-backup"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowHomePageDialog(false);
                    setExistingHomePage(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleChangeExistingHomeSlug}
                  disabled={changingHomeSlug || !newSlugForExistingHome.trim()}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingHomeSlug ? '変更中...' : 'スラッグを変更して設定'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ファビコン用メディアライブラリモーダル */}
        <MediaLibraryModal
          isOpen={showFaviconLibrary}
          onClose={() => setShowFaviconLibrary(false)}
          onSelect={(url) => setFormData(prev => ({ ...prev, faviconUrl: url }))}
          filterType="image"
        />

        {compareBefore && compareAfter && (
          <ContentCompareModal
            isOpen={showCompare}
            onClose={() => setShowCompare(false)}
            contentType="page"
            beforeData={compareBefore}
            afterData={compareAfter}
            beforeLabel={compareBeforeLabel}
            afterLabel={compareAfterLabel}
          />
        )}
      </AdminLayout>
    </AuthGuard>
  );
}

