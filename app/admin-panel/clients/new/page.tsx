'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    logoUrl: '',
    email: '',
    password: '',
    clientName: '',
    contactPerson: '',
    address: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.clientName) {
      alert('メールアドレス、パスワード、クライアント名は必須です');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('クライアントを作成しました');
        router.push('/clients');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'クライアント作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      alert(error.message || 'クライアントの作成に失敗しました');
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
              {/* ロゴ */}
              <FeaturedImageUpload
                value={formData.logoUrl}
                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
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
                label="パスワード *"
                type="password"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                required
              />

              {/* クライアント名 */}
              <FloatingInput
                label="クライアント名 *"
                value={formData.clientName}
                onChange={(value) => setFormData({ ...formData, clientName: value })}
                required
              />

              {/* 担当者 */}
              <FloatingInput
                label="担当者"
                value={formData.contactPerson}
                onChange={(value) => setFormData({ ...formData, contactPerson: value })}
              />

              {/* 所在地 */}
              <FloatingInput
                label="所在地"
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                multiline
                rows={3}
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

            {/* 作成ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title="クライアント作成"
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
      </AdminLayout>
    </AuthGuard>
  );
}

