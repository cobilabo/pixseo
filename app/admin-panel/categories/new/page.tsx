'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import { createCategory } from '@/lib/firebase/categories-admin';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function NewCategoryPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isRecommended: false,
    order: 0,
  });

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
      await createCategory({
        ...formData,
        mediaId: currentTenant.id,
      });
      
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
              <FloatingInput
                label="説明"
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                multiline
                rows={3}
              />
            </div>
          </form>

          {/* フローティング: おすすめトグル */}
          <div className="fixed bottom-32 right-8 z-50">
            <div className="bg-white rounded-full px-6 py-4 shadow-lg flex items-center gap-4 w-full">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
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

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            {/* キャンセルボタン */}
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
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
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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

