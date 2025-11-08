'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function EditTenantPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { refreshTenants } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    customDomain: '',
    subdomain: '',
    siteName: '',
    siteDescription: '',
    logoUrl: '',
    isActive: true,
  });

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch(`/api/admin/service/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            name: data.name || '',
            slug: data.slug || '',
            customDomain: data.customDomain || '',
            subdomain: data.subdomain || '',
            siteName: data.settings?.siteName || '',
            siteDescription: data.settings?.siteDescription || '',
            logoUrl: data.settings?.logoUrl || '',
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

    fetchTenant();
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
          subdomain: formData.subdomain,
          settings: {
            siteName: formData.siteName,
            siteDescription: formData.siteDescription,
            logoUrl: formData.logoUrl,
          },
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        alert('サービスを更新しました');
        await refreshTenants();
        router.push('/admin/service');
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

  if (fetchLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">サービス編集</h2>

              {/* ロゴ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ロゴ画像
                </label>
                <FeaturedImageUpload
                  value={formData.logoUrl}
                  onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                />
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
                label="スラッグ（英数字とハイフンのみ）"
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                required
              />

              {/* サブドメイン */}
              <FloatingInput
                label="サブドメイン"
                value={formData.subdomain}
                onChange={(value) => setFormData({ ...formData, subdomain: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              />

              {/* カスタムドメイン */}
              <FloatingInput
                label="カスタムドメイン（任意）"
                value={formData.customDomain}
                onChange={(value) => setFormData({ ...formData, customDomain: value })}
                placeholder="example.com"
              />

              {/* サイト名 */}
              <FloatingInput
                label="サイト名"
                value={formData.siteName}
                onChange={(value) => setFormData({ ...formData, siteName: value })}
              />

              {/* サイト説明 */}
              <FloatingInput
                label="サイトの説明"
                value={formData.siteDescription}
                onChange={(value) => setFormData({ ...formData, siteDescription: value })}
                multiline
                rows={5}
              />

              {/* アクティブ状態 */}
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    アクティブ
                  </span>
                </label>
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

            {/* 更新ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-orange-500 text-white w-14 h-14 rounded-full hover:bg-orange-600 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="メディア更新"
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

