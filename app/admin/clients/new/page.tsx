'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { FormActions } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';

export default function NewClientPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    logoUrl: '',
    email: '',
    password: '',
    clientName: '',
    contactPerson: '',
    address: '',
  });

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!formData.email || !formData.password || !formData.clientName) {
      showError('メールアドレス、パスワード、クライアント名は必須です');
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
        showSuccess('クライアントを作成しました');
        router.push('/clients');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'クライアント作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      showError(error.message || 'クライアントの作成に失敗しました');
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
                label="ロゴ"
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
                label="クライアント名 *"
                value={formData.clientName}
                onChange={(value) => setFormData({ ...formData, clientName: value })}
                required
              />

              <FloatingInput
                label="担当者"
                value={formData.contactPerson}
                onChange={(value) => setFormData({ ...formData, contactPerson: value })}
              />

              <FloatingInput
                label="所在地"
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                multiline
                rows={3}
              />
            </div>
          </form>

          <FormActions
            loading={loading}
            onSubmit={handleSubmit}
            submitTitle="クライアント作成"
          />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
