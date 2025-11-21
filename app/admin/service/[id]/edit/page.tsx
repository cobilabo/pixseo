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
    allowIndexing: false,
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
            siteDescription: data.siteDescription || data.settings?.siteDescription || '',
            logoLandscape: data.logoLandscape || data.settings?.logos?.landscape || '',
            logoSquare: data.logoSquare || data.settings?.logos?.square || '',
            logoPortrait: data.logoPortrait || data.settings?.logos?.portrait || '',
            clientId: data.clientId || '',
            isActive: data.isActive !== undefined ? data.isActive : true,
            allowIndexing: data.allowIndexing || false,
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
          siteDescription: formData.siteDescription,
          logoLandscape: formData.logoLandscape,
          logoSquare: formData.logoSquare,
          logoPortrait: formData.logoPortrait,
          isActive: formData.isActive,
          allowIndexing: formData.allowIndexing,
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
                    label="ロゴタイプ画像"
                  />
                </div>

                {/* 正方形ロゴ */}
                <div>
                  <FeaturedImageUpload
                    value={formData.logoSquare}
                    onChange={(url) => setFormData({ ...formData, logoSquare: url })}
                    label="シンボルマーク画像"
                  />
                </div>

                {/* 縦長ロゴ */}
                <div>
                  <FeaturedImageUpload
                    value={formData.logoPortrait}
                    onChange={(url) => setFormData({ ...formData, logoPortrait: url })}
                    label="ファビコン画像"
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
              <FloatingInput
                label="スラッグ（英数字とハイフンのみ）*"
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                required
                disabled
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

              {/* サービス説明 */}
              <FloatingInput
                label="サービス説明（SEO用メタディスクリプション）"
                value={formData.siteDescription}
                onChange={(value) => setFormData({ ...formData, siteDescription: value })}
                multiline
                rows={5}
              />

            </div>
          </form>

          {/* トグルエリア（固定位置） */}
          <div className="fixed bottom-36 right-8 w-32 space-y-4 z-50">
            {/* インデックス許可トグル */}
            <div className="bg-white rounded-full px-6 py-3 shadow-custom">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">インデックス</span>
                <label className="cursor-pointer">
                  <div className="relative inline-block w-14 h-8">
                    <input
                      type="checkbox"
                      checked={formData.allowIndexing}
                      onChange={(e) => setFormData({ ...formData, allowIndexing: e.target.checked })}
                      className="sr-only"
                    />
                    <div 
                      className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
                        formData.allowIndexing ? 'bg-blue-600' : 'bg-gray-400'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        formData.allowIndexing ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 有効化トグル */}
            <div className="bg-white rounded-full px-6 py-3 shadow-custom">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
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
                      className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
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
          </div>

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            {/* キャンセルボタン */}
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center shadow-custom"
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
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-custom"
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
