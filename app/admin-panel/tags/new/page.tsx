'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { createTag } from '@/lib/firebase/tags-admin';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function NewTagPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      alert('タグ名とスラッグは必須です');
      return;
    }

    if (!currentTenant) {
      alert('メディアテナントが選択されていません');
      return;
    }

    setLoading(true);
    try {
      await createTag({
        ...formData,
        mediaId: currentTenant.id,
      });
      
      alert('タグを作成しました');
      router.push('/tags');
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('タグの作成に失敗しました');
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
            {/* タグ名 */}
            <div className="bg-white rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* スラッグ */}
            <div className="bg-white rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スラッグ（URL） *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="tag-slug"
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
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '作成中...' : 'タグを作成'}
              </button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

