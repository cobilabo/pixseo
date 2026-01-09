'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { FormActions } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';

export default function NewAccountPage() {
  const { currentTenant } = useMediaTenant();
  const { showSuccessAndNavigate, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    logoUrl: '',
    email: '',
    password: '',
    displayName: '',
  });

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!formData.email || !formData.password || !formData.displayName) {
      showError('メールアドレス、パスワード、表示名は必須です');
      return;
    }

    if (formData.password.length < 6) {
      showError('パスワードは6文字以上で入力してください');
      return;
    }

    if (!currentTenant) {
      showError('サービスが選択されていません');
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
          displayName: formData.displayName,
          logoUrl: formData.logoUrl,
          mediaId: currentTenant.id,
        }),
      });

      if (response.ok) {
        showSuccessAndNavigate('アカウントを作成しました', '/admin/accounts');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'アカウント作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      showError(error.message || 'アカウントの作成に失敗しました');
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
                label="パスワード *"
                type="password"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                required
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
            submitTitle="アカウント作成"
          />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
