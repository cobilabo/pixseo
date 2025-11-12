'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';

export default function EditBlockPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
  });

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const response = await fetch(`/api/admin/blocks/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            title: data.title || '',
            imageUrl: data.imageUrl || '',
            linkUrl: data.linkUrl || '',
            isActive: data.isActive !== undefined ? data.isActive : true,
          });
        }
      } catch (error) {
        console.error('Error fetching block:', error);
        alert('ブロック情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchBlock();
  }, [params.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.imageUrl) {
      alert('タイトルと画像は必須です');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/blocks/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('ブロックを更新しました');
        router.push('/blocks');
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating block:', error);
      alert('ブロックの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="max-w-4xl pb-32 animate-fadeIn">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">ブロック編集</h2>

              {/* ブロック画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ブロック画像 *
                </label>
                <FeaturedImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                />
              </div>

              {/* タイトル */}
              <FloatingInput
                label="タイトル"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                required
              />

              {/* リンク先URL */}
              <FloatingInput
                label="リンク先URL（任意）"
                value={formData.linkUrl}
                onChange={(value) => setFormData({ ...formData, linkUrl: value })}
                type="url"
              />

              {/* 表示状態 */}
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    表示する
                  </span>
                </label>
              </div>
            </div>
          </form>

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            {/* キャンセルボタン */}
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

            {/* 更新ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="ブロック更新"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}

