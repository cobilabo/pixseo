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
  });

  useEffect(() => {
    // クライアント一覧を取得
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

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
          settings: {
            siteDescription: formData.siteDescription || '',
            logos: {
              landscape: formData.logoLandscape || '',
              square: formData.logoSquare || '',
              portrait: formData.logoPortrait || '',
            },
          },
        }),
      });

      if (response.ok) {
        alert('サービスを作成しました');
        await refreshTenants();
        router.push('/admin/service');
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
        <div className="max-w-4xl pb-32">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg p-6 space-y-6">
              {/* ロゴ3種類（横並び） */}
              <div className="grid grid-cols-3 gap-4">
                {/* 横長ロゴ */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 text-center">
                    横長
                  </label>
                  <FeaturedImageUpload
                    value={formData.logoLandscape}
                    onChange={(url) => setFormData({ ...formData, logoLandscape: url })}
                  />
                </div>

                {/* 正方形ロゴ */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 text-center">
                    正方形
                  </label>
                  <FeaturedImageUpload
                    value={formData.logoSquare}
                    onChange={(url) => setFormData({ ...formData, logoSquare: url })}
                  />
                </div>

                {/* 縦長ロゴ */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 text-center">
                    縦長
                  </label>
                  <FeaturedImageUpload
                    value={formData.logoPortrait}
                    onChange={(url) => setFormData({ ...formData, logoPortrait: url })}
                  />
                </div>
              </div>

              {/* サービス名 */}
              <FloatingInput
                label="サービス名 *"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              {/* スラッグ（サブドメイン） */}
              <FloatingInput
                label="スラッグ（英数字とハイフンのみ）*"
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                required
              />

              {/* クライアント選択 */}
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

              {/* カスタムドメイン */}
              <FloatingInput
                label="カスタムドメイン"
                value={formData.customDomain}
                onChange={(value) => setFormData({ ...formData, customDomain: value })}
              />

              {/* サイトの説明 */}
              <FloatingInput
                label="サイトの説明（SEO用メタディスクリプション）"
                value={formData.siteDescription}
                onChange={(value) => setFormData({ ...formData, siteDescription: value })}
                multiline
                rows={5}
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
              title="サービス作成"
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
