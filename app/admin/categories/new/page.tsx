'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { createCategory } from '@/lib/firebase/categories-admin';

export default function NewCategoryPage() {
  const router = useRouter();
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

    setLoading(true);
    try {
      await createCategory(formData);
      
      alert('カテゴリーを作成しました');
      router.push('/admin/categories');
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
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* カテゴリー名 */}
            <div className="bg-white shadow rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリー名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            {/* スラッグ */}
            <div className="bg-white shadow rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スラッグ（URL） *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="category-slug"
                  required
                />
                <button
                  type="button"
                  onClick={generateSlug}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  自動生成
                </button>
              </div>
            </div>

            {/* 説明 */}
            <div className="bg-white shadow rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>

            {/* 並び順 */}
            <div className="bg-white shadow rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                並び順
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* おすすめ設定 */}
            <div className="bg-white shadow rounded-lg p-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecommended}
                  onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  おすすめカテゴリーとして表示する
                </span>
              </label>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '作成中...' : 'カテゴリーを作成'}
              </button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

