'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Client } from '@/types/client';

export default function EditServicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { refreshTenants } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
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
    isActive: true,
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

    const fetchService = async () => {
      try {
        const response = await fetch(`/api/admin/service/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            name: data.name || '',
            slug: data.slug || '',
            customDomain: data.customDomain || '',
            siteDescription: data.settings?.siteDescription || '',
            logoLandscape: data.settings?.logos?.landscape || '',
            logoSquare: data.settings?.logos?.square || '',
            logoPortrait: data.settings?.logos?.portrait || '',
            clientId: data.clientId || '',
            isActive: data.isActive !== undefined ? data.isActive : true,
          });
        }
      } catch (error) {
        console.error('Error fetching service:', error);
        alert('サービス情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchClients();
    fetchService();
  }, [params.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      alert('サービス名とスラッグは必須です');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/service/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          customDomain: formData.customDomain || undefined,
          clientId: formData.clientId || undefined,
          settings: {
            siteDescription: formData.siteDescription,
            logos: {
              landscape: formData.logoLandscape,
              square: formData.logoSquare,
              portrait: formData.logoPortrait,
            },
          },
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        alert('サービスを更新しました');
        await refreshTenants();
        router.push('/service');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'サービス更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating service:', error);
      alert(error.message || 'サービスの更新に失敗しました');
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
              {/* ロゴ3種類（横並び） */}
              <div className="grid grid-cols-3 gap-4">
                {/* 横長ロゴ */}
                <div>
                  <FeaturedImageUpload
                    value={formData.logoLandscape}
                    onChange={(url) => setFormData({ ...formData, logoLandscape: url })}
                    label="ロゴ(横長)画像を選択"
                  />
                </div>

                {/* 正方形ロゴ */}
                <div>
                  <FeaturedImageUpload
                    value={formData.logoSquare}
                    onChange={(url) => setFormData({ ...formData, logoSquare: url })}
                    label="ロゴ(正方形)画像を選択"
                  />
                </div>

                {/* 縦長ロゴ */}
                <div>
                  <FeaturedImageUpload
                    value={formData.logoPortrait}
                    onChange={(url) => setFormData({ ...formData, logoPortrait: url })}
                    label="ロゴ(縦長)画像を選択"
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

              {/* スラッグ */}
              <div className="relative">
                <FloatingInput
                  label="スラッグ（英数字とハイフンのみ）*"
                  value={formData.slug}
                  onChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  required
                  disabled
                />
                <style jsx>{`
                  input:disabled {
                    color: #9CA3AF !important;
                  }
                `}</style>
              </div>

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

          {/* フローティング: 有効化トグル */}
          <div className="fixed bottom-32 right-8 z-50">
            <div className="bg-white rounded-full px-6 py-4 shadow-lg flex items-center gap-4 w-full">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                有効化
              </span>
              <label className="cursor-pointer">
                <div className="relative inline-block w-14 h-8">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only"
                  />
                  <div 
                    className={`absolute inset-0 rounded-full transition-colors ${
                      formData.isActive ? 'bg-blue-600' : 'bg-gray-400'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </label>
            </div>
          </div>

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

            {/* 更新ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title="サービス更新"
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
