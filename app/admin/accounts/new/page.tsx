'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';

export default function NewAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    displayName: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.passwordConfirm) {
      alert('パスワードが一致しません');
      return;
    }

    if (formData.password.length < 6) {
      alert('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName || undefined,
        }),
      });

      if (response.ok) {
        alert('アカウントを作成しました');
        router.push('/admin/accounts');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'アカウント作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      alert(error.message || 'アカウント作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-2xl pb-32">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">新規アカウント作成</h2>

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

              <FloatingInput
                label="パスワード"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                type="password"
                required
              />

              <FloatingInput
                label="パスワード（確認）"
                value={formData.passwordConfirm}
                onChange={(value) => setFormData({ ...formData, passwordConfirm: value })}
                type="password"
                required
              />

              <div className="text-sm text-gray-500">
                ※ パスワードは6文字以上で入力してください
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
              className="bg-orange-500 text-white w-14 h-14 rounded-full hover:bg-orange-600 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="アカウント作成"
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

