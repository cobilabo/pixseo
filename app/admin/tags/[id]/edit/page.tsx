'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { getTagById, updateTag } from '@/lib/firebase/tags-admin';
import { Tag } from '@/types/article';

export default function EditTagPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [tag, setTag] = useState<Tag | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tagData = await getTagById(params.id);
        
        if (!tagData) {
          alert('タグが見つかりません');
          router.push('/admin/tags');
          return;
        }

        setTag(tagData);
        setFormData({
          name: tagData.name,
          slug: tagData.slug,
        });
      } catch (error) {
        console.error('Error fetching tag:', error);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      alert('タグ名とスラッグは必須です');
      return;
    }

    if (!tag) {
      alert('タグデータの読み込みに失敗しました');
      return;
    }

    setLoading(true);
    try {
      await updateTag(params.id, {
        ...formData,
        mediaId: tag.mediaId,
      });
      
      alert('タグを更新しました');
      router.push('/admin/tags');
    } catch (error) {
      console.error('Error updating tag:', error);
      alert('タグの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

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
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="tag-slug"
                required
              />
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
                {loading ? '更新中...' : 'タグを更新'}
              </button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

