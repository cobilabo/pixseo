'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiPost } from '@/lib/api-client';

export default function NewBannerPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.imageUrl) {
      alert('タイトルと画像は必須です');
      return;
    }

    if (!currentTenant) {
      alert('メディアが選択されていません');
      return;
    }

    setLoading(true);

    try {
      await apiPost('/api/admin/banners', {
        ...formData,
        mediaId: currentTenant.id,
      });

      alert('バナーを作成しました');
      router.push('/admin/banners');
    } catch (error) {
      console.error('Error creating banner:', error);
      alert('バナーの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">新規バナー作成</h2>

              {/* バナー画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  バナー画像 *
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
                    すぐに表示する
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

            {/* 作成ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="バナー作成"
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

