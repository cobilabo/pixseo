'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  logoLandscape: string;
  logoSquare: string;
  logoPortrait: string;
  allowIndexing: boolean;
}

export default function SitePage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState<SiteSettings>({
    siteName: '',
    siteDescription: '',
    logoLandscape: '',
    logoSquare: '',
    logoPortrait: '',
    allowIndexing: false,
  });

  const fetchSettings = useCallback(async () => {
    if (!currentTenant) {
      console.log('[Site Settings] No currentTenant, skipping fetch');
      setFetchLoading(false);
      return;
    }

    setFetchLoading(true);
    console.log('[Site Settings] Fetching for tenant:', currentTenant.id);

    try {
      const response = await fetch(`/api/admin/service/${currentTenant.id}`);
      console.log('[Site Settings] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Site Settings] Fetched data:', data);
        console.log('[Site Settings] siteDescription:', data.siteDescription);
        
        const newFormData = {
          siteName: data.name || '',
          siteDescription: data.siteDescription || '',
          logoLandscape: data.logoLandscape || '',
          logoSquare: data.logoSquare || '',
          logoPortrait: data.logoPortrait || '',
          allowIndexing: data.allowIndexing || false,
        };
        
        console.log('[Site Settings] Setting formData:', newFormData);
        setFormData(newFormData);
      } else {
        console.error('[Site Settings] Failed to fetch:', response.status);
        const errorText = await response.text();
        console.error('[Site Settings] Error response:', errorText);
      }
    } catch (error) {
      console.error('[Site Settings] Error fetching site settings:', error);
    } finally {
      setFetchLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentTenant) {
      showError('サービスが選択されていません');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/service/${currentTenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.siteName,
          siteDescription: formData.siteDescription,
          logoLandscape: formData.logoLandscape,
          logoSquare: formData.logoSquare,
          logoPortrait: formData.logoPortrait,
          allowIndexing: formData.allowIndexing,
        }),
      });

      if (response.ok) {
        showSuccess('サイト設定を保存しました');
        fetchSettings();
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating site settings:', error);
      showError('サイト設定の更新に失敗しました');
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

              {/* サイト名 */}
              <FloatingInput
                label="サービス名 *"
                value={formData.siteName}
                onChange={(value) => setFormData({ ...formData, siteName: value })}
                required
              />

              {/* サービス説明 */}
              <FloatingInput
                label="サービス説明（SEO用メタディスクリプション）"
                value={formData.siteDescription}
                onChange={(value) => setFormData({ ...formData, siteDescription: value })}
                multiline
                rows={3}
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
          </div>

          {/* フローティング更新ボタン */}
          <div className="fixed bottom-8 right-8 z-50">
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="設定を保存"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}

