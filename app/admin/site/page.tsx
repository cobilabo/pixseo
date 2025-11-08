'use client';

import { useState, useEffect, FormEvent } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
}

export default function SitePage() {
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState<SiteSettings>({
    siteName: '',
    siteDescription: '',
    logoUrl: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/site');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          siteName: data.siteName || '',
          siteDescription: data.siteDescription || '',
          logoUrl: data.logoUrl || '',
        });
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await fetch('/api/admin/site', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('サイト設定を更新しました');
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating site settings:', error);
      alert('サイト設定の更新に失敗しました');
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
              <h2 className="text-xl font-bold text-gray-900">サイト管理</h2>

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

              {/* サイト名 */}
              <FloatingInput
                label="サイト名"
                value={formData.siteName}
                onChange={(value) => setFormData({ ...formData, siteName: value })}
                required
              />

              {/* サイトの説明 */}
              <FloatingInput
                label="サイトの説明"
                value={formData.siteDescription}
                onChange={(value) => setFormData({ ...formData, siteDescription: value })}
                multiline
                rows={5}
              />

              <div className="text-sm text-gray-500">
                ※ サイト名と説明は、メタタグやSEOに使用されます
              </div>
            </div>
          </form>

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
      </AdminLayout>
    </AuthGuard>
  );
}

