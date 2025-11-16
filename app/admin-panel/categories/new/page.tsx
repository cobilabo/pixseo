'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { createCategory } from '@/lib/firebase/categories-admin';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function NewCategoryPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    imageAlt: '',
    isRecommended: false,
    order: 0,
  });

  const generateDescription = async () => {
    if (!formData.name) {
      alert('カテゴリー名を入力してください');
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await fetch('/api/admin/categories/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, description: data.description }));
    } catch (error) {
      console.error('Error generating description:', error);
      alert('説明の生成に失敗しました');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      alert('カテゴリー名とスラッグは必須です');
      return;
    }

    if (!currentTenant) {
      alert('メディアテナントが選択されていません');
      return;
    }

    setLoading(true);
    try {
      // API経由で作成（翻訳処理を含む）
      const response = await fetch('/api/admin/categories/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          mediaId: currentTenant.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }
      
      alert('カテゴリーを作成しました');
      router.push('/categories');
    } catch (error) {
      console.error('Error creating category:', error);
      alert('カテゴリーの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData({ ...formData, slug });
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32 animate-fadeIn">
          <form id="category-new-form" onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl p-6 space-y-6">
              {/* カテゴリー名 */}
              <FloatingInput
                label="カテゴリー名 *"
                value={formData.name}
                onChange={(value) => {
                  setFormData({ ...formData, name: value });
                  // 自動でスラッグを生成
                  const slug = value
                    .toLowerCase()
                    .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                  setFormData({ ...formData, name: value, slug });
                }}
                required
              />

              {/* スラッグ */}
              <FloatingInput
                label="スラッグ（英数字とハイフンのみ）*"
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                required
              />

              {/* 説明 */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <FloatingInput
                    label="説明（SEO用: 120-180文字推奨）"
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    multiline
                    rows={3}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={generatingDescription || !formData.name}
                  className="w-12 h-12 mb-0.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="説明文をAI自動生成"
                >
                  {generatingDescription ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
                  )}
                </button>
              </div>

              {/* カテゴリー画像 */}
              <div>
                <FeaturedImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => {
                    console.log('[CategoryNew] onChange called with URL:', url);
                    setFormData(prev => {
                      const newData = { ...prev, imageUrl: url };
                      console.log('[CategoryNew] New formData:', newData);
                      return newData;
                    });
                  }}
                  alt={formData.imageAlt}
                  onAltChange={(alt) => {
                    console.log('[CategoryNew] onAltChange called with alt:', alt);
                    setFormData(prev => {
                      const newData = { ...prev, imageAlt: alt };
                      console.log('[CategoryNew] New formData (alt):', newData);
                      return newData;
                    });
                  }}
                  label="カテゴリー画像"
                  showImageGenerator={true}
                  imageGeneratorTitle={`${formData.name}カテゴリー`}
                  imageGeneratorContent={formData.description}
                />
              </div>
            </div>
          </form>

          {/* フローティング: おすすめトグル */}
          <div className="fixed bottom-32 right-8 w-32 z-50">
            <div className="bg-white rounded-full px-6 py-3 shadow-custom">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  おすすめ
                </span>
              <label className="cursor-pointer">
                <div className="relative inline-block w-14 h-8">
                  <input
                    type="checkbox"
                    checked={formData.isRecommended}
                    onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })}
                    className="sr-only"
                  />
                  <div 
                    className={`absolute inset-0 rounded-full transition-colors ${
                      formData.isRecommended ? 'bg-blue-600' : 'bg-gray-400'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      formData.isRecommended ? 'translate-x-6' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </label>
              </div>
            </div>
          </div>

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            {/* キャンセルボタン */}
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center shadow-custom"
              title="キャンセル"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 作成ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-custom"
              title="カテゴリーを作成"
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
      </AdminLayout>
    </AuthGuard>
  );
}

