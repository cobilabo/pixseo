'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import DomainSetupPanel from '@/components/admin/DomainSetupPanel';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Client } from '@/types/client';
import { DomainConfig, PreviewAuth } from '@/types/media-tenant';
import { FormActions, Toggle } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';

export default function EditServicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { refreshTenants } = useMediaTenant();
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    customDomain: '',
    domainConfig: undefined as DomainConfig | undefined,
    siteDescription: '',
    logoLandscape: '',
    logoSquare: '',
    logoPortrait: '',
    clientId: '',
    isActive: true,
    allowIndexing: false,
    previewAuth: {
      enabled: false,
      username: '',
      password: '',
    } as PreviewAuth,
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

    const fetchService = async () => {
      try {
        const response = await fetch(`/api/admin/service/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            name: data.name || '',
            slug: data.slug || '',
            customDomain: data.customDomain || '',
            domainConfig: data.domainConfig || undefined,
            siteDescription: data.siteDescription || data.settings?.siteDescription || '',
            logoLandscape: data.logoLandscape || data.settings?.logos?.landscape || '',
            logoSquare: data.logoSquare || data.settings?.logos?.square || '',
            logoPortrait: data.logoPortrait || data.settings?.logos?.portrait || '',
            clientId: data.clientId || '',
            isActive: data.isActive !== undefined ? data.isActive : true,
            allowIndexing: data.allowIndexing || false,
            previewAuth: data.previewAuth || { enabled: false, username: '', password: '' },
          });
        }
      } catch (error) {
        console.error('Error fetching service:', error);
        showError('サービス情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchClients();
    fetchService();
  }, [params.id]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!formData.name || !formData.slug) {
      showError('サービス名とスラッグは必須です');
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
          previewAuth: formData.previewAuth,
        }),
      });

      if (response.ok) {
        showSuccess('サービスを更新しました');
        await refreshTenants();
        router.push('/service');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'サービス更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating service:', error);
      showError(error.message || 'サービスの更新に失敗しました');
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
                  disabled
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
                  label="サービス説明（SEO用メタディスクリプション）"
                  value={formData.siteDescription}
                  onChange={(value) => setFormData({ ...formData, siteDescription: value })}
                  multiline
                  rows={5}
                />
              </div>
            </form>

            {/* プレビューサイト設定 */}
            <div className="bg-white rounded-xl p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">プレビューサイト設定</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビューURL</label>
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://${formData.slug}.pixseo-preview.cloud`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    https://{formData.slug}.pixseo-preview.cloud
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://${formData.slug}.pixseo-preview.cloud`);
                      showSuccess('URLをコピーしました');
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="URLをコピー"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ベーシック認証</label>
                    <p className="text-xs text-gray-500">プレビューサイトにアクセス制限をかけます</p>
                  </div>
                  <Toggle
                    checked={formData.previewAuth.enabled}
                    onChange={(checked) => setFormData({ 
                      ...formData, 
                      previewAuth: { ...formData.previewAuth, enabled: checked } 
                    })}
                  />
                </div>
              </div>
              
              {formData.previewAuth.enabled && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー名</label>
                    <input
                      type="text"
                      value={formData.previewAuth.username}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        previewAuth: { ...formData.previewAuth, username: e.target.value } 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="ユーザー名を入力"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.previewAuth.password}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          previewAuth: { ...formData.previewAuth, password: e.target.value } 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900"
                        placeholder="パスワードを入力"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm text-yellow-800">
                        ベーシック認証はプレビューサイト（{formData.slug}.pixseo-preview.cloud）にのみ適用されます。
                        カスタムドメインには適用されません。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <DomainSetupPanel
                serviceId={params.id}
                currentDomain={formData.customDomain}
                domainConfig={formData.domainConfig}
                onSetupComplete={async () => {
                  const response = await fetch(`/api/admin/service/${params.id}`);
                  if (response.ok) {
                    const data = await response.json();
                    setFormData(prev => ({
                      ...prev,
                      customDomain: data.customDomain || '',
                      domainConfig: data.domainConfig || undefined,
                    }));
                  }
                }}
              />
            </div>

            {/* トグルエリア（固定位置） */}
            <div className="fixed bottom-36 right-8 w-32 space-y-4 z-50">
              <div className="bg-white rounded-full px-6 py-3 shadow-custom">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">インデックス</span>
                  <Toggle
                    checked={formData.allowIndexing}
                    onChange={(checked) => setFormData({ ...formData, allowIndexing: checked })}
                  />
                </div>
              </div>

              <div className="bg-white rounded-full px-6 py-3 shadow-custom">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gray-700 whitespace-nowrap">有効化</span>
                  <Toggle
                    checked={formData.isActive}
                    onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
            </div>

            <FormActions
              loading={loading}
              onSubmit={handleSubmit}
              submitTitle="サービス更新"
            />
          </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
