'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { FormActions } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';

export default function EditAccountPage({ params }: { params: { uid: string } }) {
  const { showSuccessAndNavigate, showError } = useToast();
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
            password: '',
            displayName: data.displayName || '',
          });
        }
      } catch (error) {
        console.error('Error fetching account:', error);
        showError('アカウント情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchAccount();
  }, [params.uid]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!formData.email || !formData.displayName) {
      showError('メールアドレス、表示名は必須です');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      showError('パスワードは6文字以上で入力してください');
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
        showSuccessAndNavigate('アカウントを更新しました', '/admin/accounts');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'アカウント更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating account:', error);
      showError(error.message || 'アカウントの更新に失敗しました');
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
                <FeaturedImageUpload
                  value={formData.logoUrl}
                  onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                  label="アイコン画像"
                />

                <FloatingInput
                  label="メールアドレス *"
                  type="email"
                  value={formData.email}
                  onChange={(value) => setFormData({ ...formData, email: value })}
                  required
                />

                <FloatingInput
                  label="パスワード（変更する場合のみ入力）"
                  type="password"
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                />

                <FloatingInput
                  label="表示名 *"
                  value={formData.displayName}
                  onChange={(value) => setFormData({ ...formData, displayName: value })}
                  required
                />
              </div>
            </form>

            <FormActions
              loading={loading}
              onSubmit={handleSubmit}
              submitTitle="アカウント更新"
            />
          </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
