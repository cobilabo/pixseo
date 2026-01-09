'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { FormActions } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';

export default function EditClientPage({ params }: { params: { id: string } }) {
  const { showSuccessAndNavigate, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    logoUrl: '',
    email: '',
    password: '',
    clientName: '',
    contactPerson: '',
    address: '',
  });

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/admin/clients/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            logoUrl: data.logoUrl || '',
            email: data.email || '',
            password: '',
            clientName: data.clientName || '',
            contactPerson: data.contactPerson || '',
            address: data.address || '',
          });
        }
      } catch (error) {
        console.error('Error fetching client:', error);
        showError('クライアント情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchClient();
  }, [params.id]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!formData.email || !formData.clientName) {
      showError('メールアドレス、クライアント名は必須です');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/clients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showSuccessAndNavigate('クライアントを更新しました', '/admin/clients');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'クライアント更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating client:', error);
      showError(error.message || 'クライアントの更新に失敗しました');
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
                  label="パスワード（変更する場合のみ入力）"
                  type="password"
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
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
              submitTitle="クライアント更新"
            />
          </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
