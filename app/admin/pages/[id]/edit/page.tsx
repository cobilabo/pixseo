'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import RichTextEditor from '@/components/admin/RichTextEditor';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { updatePage, getPageById } from '@/lib/firebase/pages-admin';
import { Page } from '@/types/page';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiGet } from '@/lib/api-client';

export default function EditPagePage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [serpPreviewDevice, setSerpPreviewDevice] = useState<'pc' | 'sp'>('pc');
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [generatingMetaTitle, setGeneratingMetaTitle] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    isPublished: false,
    metaTitle: '',
    metaDescription: '',
    order: 0,
    parentId: '',
  });

  useEffect(() => {
    fetchPage();
    fetchPages();
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
        parentId: page.parentId || '',
      });
      
      setFeaturedImageUrl(page.featuredImage || '');
      setFeaturedImageAlt(page.featuredImageAlt || '');
      setFetchLoading(false);
    } catch (error) {
      console.error('Error fetching page:', error);
      alert('固定ページの取得に失敗しました');
      setFetchLoading(false);
    }
  };

  const fetchPages = async () => {
    try {
      const data = await apiGet<Page[]>('/api/admin/pages');
      setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
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
    
    if (!formData.title || !formData.content || !formData.slug) {
      alert('タイトル、本文、スラッグは必須です');
      return;
    }

    if (!currentTenant) {
      alert('メディアテナントが選択されていません');
      return;
    }

    setLoading(true);
    try {
      await updatePage(pageId, {
        ...formData,
        featuredImage: featuredImageUrl,
        featuredImageAlt: featuredImageAlt,
        parentId: formData.parentId || undefined,
      });
      
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

  // 親ページとして選択可能なページ（自分自身以外）
  const parentPageOptions = pages.filter(p => p.id !== pageId);

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
        <div className="max-w-4xl pb-32 animate-fadeIn">
          <form id="page-edit-form" onSubmit={handleSubmit}>
            {/* アイキャッチ画像 */}
            <div className="mb-6">
              <div className="bg-white rounded-xl p-6">
                <FeaturedImageUpload
                  value={featuredImageUrl}
                  onChange={setFeaturedImageUrl}
                  alt={featuredImageAlt}
                  onAltChange={setFeaturedImageAlt}
                  showImageGenerator={false}
                />
              </div>
            </div>

            {/* すべてのフィールドを1つのパネル内に表示 */}
            <div className="bg-white rounded-xl p-6 space-y-6">
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

              {/* 親ページ選択 */}
              {parentPageOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    親ページ（階層構造用・任意）
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">なし（トップレベル）</option>
                    {parentPageOptions.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

              {/* 本文 */}
              <div>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                />
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
            </div>
          </form>

          {/* SERP プレビュー */}
          <div className="bg-white rounded-xl p-6 mt-6">
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
                  {currentTenant?.slug ? `${currentTenant.slug}.pixseo.cloud` : 'example.pixseo.cloud'} › {formData.slug || 'page-slug'}
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

