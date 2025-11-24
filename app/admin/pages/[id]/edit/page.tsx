'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import ColorPicker from '@/components/admin/ColorPicker';
import CustomCheckbox from '@/components/admin/CustomCheckbox';
import { updatePage, getPageById } from '@/lib/firebase/pages-admin';
import { Page } from '@/types/page';
import { Block } from '@/types/block';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiGet } from '@/lib/api-client';
import BlockBuilder, { BlockBuilderRef } from '@/components/admin/BlockBuilder';

export default function EditPagePage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;
  const { currentTenant } = useMediaTenant();
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
  });

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  const fetchPage = async () => {
    try {
      const page = await getPageById(pageId);
      if (!page) {
        alert('固定ページが見つかりません');
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
      });
      
      // ブロックビルダーデータを読み込み
      setBlocks(page.blocks || []);
      
      setFetchLoading(false);
    } catch (error) {
      console.error('Error fetching page:', error);
      alert('固定ページの取得に失敗しました');
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.slug) {
      alert('タイトルとスラッグは必須です');
      return;
    }
    
    // BlockBuilderから現在のブロックを取得
    // ページ設定タブから保存する場合、refがnullになるのでblocksステートを使用
    const currentBlocks = blockBuilderRef.current?.getCurrentBlocks() || blocks;

    if (!currentTenant) {
      alert('メディアテナントが選択されていません');
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
      
      await updatePage(pageId, updateData);
      
      alert('固定ページを更新しました');
      router.push('/pages');
    } catch (error) {
      console.error('Error updating page:', error);
      alert('固定ページの更新に失敗しました');
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

              {/* スラッグ - 自動生成ボタン付き */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <FloatingInput
                    label="スラッグ（URL）"
                    value={formData.slug}
                    onChange={(value) => setFormData({ ...formData, slug: value })}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={generateSlug}
                  disabled={generatingSlug || !formData.title}
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
      </AdminLayout>
    </AuthGuard>
  );
}

