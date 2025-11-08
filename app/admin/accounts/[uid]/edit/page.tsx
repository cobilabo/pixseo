'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';

export default function EditAccountPage({ params }: { params: { uid: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    displayName: '',
  });

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch(`/api/admin/accounts/${params.uid}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            email: data.email || '',
            password: '',
            passwordConfirm: '',
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

    if (formData.password && formData.password !== formData.passwordConfirm) {
      alert('パスワードが一致しません');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      alert('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        email: formData.email,
        displayName: formData.displayName || undefined,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/admin/accounts/${params.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('アカウントを更新しました');
        router.push('/admin/accounts');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'アカウント更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating account:', error);
      alert(error.message || 'アカウント更新に失敗しました');
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
        <div className="max-w-2xl pb-32">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">アカウント編集</h2>

              <FloatingInput
                label="メールアドレス"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                type="email"
                required
              />

              <FloatingInput
                label="表示名（任意）"
                value={formData.displayName}
                onChange={(value) => setFormData({ ...formData, displayName: value })}
              />

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">パスワード変更（任意）</h3>

                <div className="space-y-6">
                  <FloatingInput
                    label="新しいパスワード"
                    value={formData.password}
                    onChange={(value) => setFormData({ ...formData, password: value })}
                    type="password"
                  />

                  <FloatingInput
                    label="新しいパスワード（確認）"
                    value={formData.passwordConfirm}
                    onChange={(value) => setFormData({ ...formData, passwordConfirm: value })}
                    type="password"
                  />

                  <div className="text-sm text-gray-500">
                    ※ パスワードを変更する場合は6文字以上で入力してください
                    <br />
                    ※ 変更しない場合は空欄のままにしてください
                  </div>
                </div>
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
              className="bg-orange-500 text-white w-14 h-14 rounded-full hover:bg-orange-600 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="アカウント更新"
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

