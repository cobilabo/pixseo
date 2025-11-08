'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function NewWriterPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    iconUrl: '',
    handleName: '',
    bio: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentTenant) {
      alert('サービスが選択されていません。ライターを作成できません。');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/writers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iconUrl: formData.iconUrl,
          handleName: formData.handleName,
          bio: formData.bio,
          mediaId: currentTenant.id,
        }),
      });

      if (response.ok) {
        alert('ライターを作成しました');
        router.push('/writers');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'ライター作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Error creating writer:', error);
      alert(error.message || 'ライターの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32 animate-fadeIn">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl p-6 space-y-6">
              {/* アイコン */}
              <FeaturedImageUpload
                value={formData.iconUrl}
                onChange={(url) => setFormData({ ...formData, iconUrl: url })}
              />

              {/* ハンドルネーム */}
              <FloatingInput
                label="ハンドルネーム *"
                value={formData.handleName}
                onChange={(value) => setFormData({ ...formData, handleName: value })}
                required
              />

              {/* 紹介文 */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  紹介文
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="ライターの紹介文を入力してください"
                />
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
              title="ライター作成"
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

