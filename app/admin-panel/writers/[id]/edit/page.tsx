'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { Writer } from '@/types/writer';

export default function EditWriterPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    iconUrl: '',
    handleName: '',
    bio: '',
  });

  useEffect(() => {
    const fetchWriter = async () => {
      try {
        const response = await fetch(`/api/admin/writers/${params.id}`);
        if (response.ok) {
          const data: Writer = await response.json();
          setFormData({
            iconUrl: data.icon || '',
            handleName: data.handleName || '',
            bio: data.bio || '',
          });
        }
      } catch (error) {
        console.error('Error fetching writer:', error);
        alert('ライター情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchWriter();
  }, [params.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/writers/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          icon: formData.iconUrl,
          handleName: formData.handleName,
          bio: formData.bio,
        }),
      });

      if (response.ok) {
        alert('ライターを更新しました');
        router.push('/writers');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'ライター更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating writer:', error);
      alert(error.message || 'ライターの更新に失敗しました');
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
            <div className="bg-white rounded-xl p-6 space-y-6">
              {/* アイコン */}
              <FeaturedImageUpload
                value={formData.iconUrl}
                onChange={(url) => setFormData({ ...formData, iconUrl: url })}
                label="アイコン画像"
              />

              {/* ハンドルネーム */}
              <FloatingInput
                label="ハンドルネーム *"
                value={formData.handleName}
                onChange={(value) => setFormData({ ...formData, handleName: value })}
                required
              />

              {/* 紹介文 */}
              <FloatingInput
                label="紹介文"
                value={formData.bio}
                onChange={(value) => setFormData({ ...formData, bio: value })}
                multiline
                rows={4}
              />
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
              title="ライターを更新"
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

