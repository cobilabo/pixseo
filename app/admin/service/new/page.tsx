'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Client } from '@/types/client';
import { FormActions } from '@/components/admin/common';

export default function NewServicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshTenants } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    customDomain: '',
    siteDescription: '',
    logoLandscape: '',
    logoSquare: '',
    logoPortrait: '',
    clientId: '',
    isActive: false,
    allowIndexing: false,
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/admin/clients');
        if (response.ok) {
          const data = await response.json();
          setClients(data);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    fetchClients();
  }, []);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!formData.name || !formData.slug) {
      alert('サービス名とスラッグは必須です');
      return;
    }

    if (!user) {
      alert('ログインしてください');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          customDomain: formData.customDomain || undefined,
          ownerId: user.uid,
          clientId: formData.clientId || undefined,
          siteDescription: formData.siteDescription || '',
          logoLandscape: formData.logoLandscape || '',
          logoSquare: formData.logoSquare || '',
          logoPortrait: formData.logoPortrait || '',
          isActive: formData.isActive,
          allowIndexing: formData.allowIndexing,
        }),
      });

      if (response.ok) {
        alert('サービスを作成しました');
        await refreshTenants();
        router.push('/service');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'サービス作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Error creating service:', error);
      alert(error.message || 'サービスの作成に失敗しました');
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
              <div className="grid grid-cols-3 gap-4">
                <FeaturedImageUpload
                  value={formData.logoLandscape}
                  onChange={(url) => setFormData({ ...formData, logoLandscape: url })}
                  label="ロゴタイプ画像"
                />
                <FeaturedImageUpload
                  value={formData.logoSquare}
                  onChange={(url) => setFormData({ ...formData, logoSquare: url })}
                  label="シンボルマーク画像"
                />
                <FeaturedImageUpload
                  value={formData.logoPortrait}
                  onChange={(url) => setFormData({ ...formData, logoPortrait: url })}
                  label="ファビコン画像"
                />
              </div>

              <FloatingInput
                label="サービス名 *"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              <FloatingInput
                label="スラッグ（英数字とハイフンのみ）*"
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                required
              />

              <FloatingSelect
                label="クライアント選択"
                value={formData.clientId}
                onChange={(value) => setFormData({ ...formData, clientId: value })}
                options={[
                  { value: '', label: '-- クライアントを選択 --' },
                  ...clients.map((client) => ({
                    value: client.id,
                    label: client.clientName,
                  })),
                ]}
              />

              <FloatingInput
                label="カスタムドメイン"
                value={formData.customDomain}
                onChange={(value) => setFormData({ ...formData, customDomain: value })}
              />

              <FloatingInput
                label="サービス説明（SEO用メタディスクリプション）"
                value={formData.siteDescription}
                onChange={(value) => setFormData({ ...formData, siteDescription: value })}
                multiline
                rows={5}
              />
            </div>
          </form>

          <FormActions
            loading={loading}
            onSubmit={handleSubmit}
            submitTitle="サービス作成"
          />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
