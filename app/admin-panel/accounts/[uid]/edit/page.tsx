'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';

export default function EditAccountPage({ params }: { params: { uid: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    logoUrl: '',
    email: '',
    password: '',
    displayName: '',
  });

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch(`/api/admin/accounts/${params.uid}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            logoUrl: data.logoUrl || '',
            email: data.email || '',
            password: '', // パスワードは空にする
            displayName: data.displayName || '',
          });
        }
      } catch (error) {
        console.error('Error fetching account:', error);
        alert('アカウント情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchAccount();
  }, [params.uid]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.displayName) {
      alert('メールアドレス、表示名は必須です');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      alert('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/accounts/${params.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password || undefined,
          displayName: formData.displayName,
          logoUrl: formData.logoUrl,
        }),
      });

      if (response.ok) {
        alert('アカウントを更新しました');
        router.push('/accounts');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'アカウント更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating account:', error);
      alert(error.message || 'アカウントの更新に失敗しました');
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
              {/* アイコン */}
              <FeaturedImageUpload
                value={formData.logoUrl}
                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                label="アイコン画像"
              />

              {/* メールアドレス */}
              <FloatingInput
                label="メールアドレス *"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                required
              />

              {/* パスワード */}
              <FloatingInput
                label="パスワード（変更する場合のみ入力）"
                type="password"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
              />

              {/* 表示名 */}
              <FloatingInput
                label="表示名 *"
                value={formData.displayName}
                onChange={(value) => setFormData({ ...formData, displayName: value })}
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
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center shadow-custom"
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
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-custom"
              title="アカウント更新"
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
