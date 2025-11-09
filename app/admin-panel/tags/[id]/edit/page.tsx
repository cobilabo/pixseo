'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
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
          router.push('/tags');
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
      router.push('/tags');
    } catch (error) {
      console.error('Error updating tag:', error);
      alert('タグの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="max-w-4xl pb-32 animate-fadeIn">
          <form id="tag-edit-form" onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl p-6 space-y-6">
              {/* タグ名 */}
              <FloatingInput
                label="タグ名 *"
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
            </div>
          </form>

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

            {/* 更新ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title="タグを更新"
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

