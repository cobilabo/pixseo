'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function NewServicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshTenants } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    customDomain: '',
    subdomain: '',
    siteName: '',
    siteDescription: '',
    logoUrl: '',
  });

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
          subdomain: formData.subdomain || formData.slug,
          ownerId: user.uid,
          settings: {
            siteName: formData.siteName || formData.name,
            siteDescription: formData.siteDescription || '',
            logoUrl: formData.logoUrl || '',
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
              <h2 className="text-xl font-bold text-gray-900 mb-6">新規サービス作成</h2>

              {/* ロゴ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ロゴ画像
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  サービスのロゴ画像をアップロードします。管理画面やユーザー向けサイトで表示されます。
                </p>
                <FeaturedImageUpload
                  value={formData.logoUrl}
                  onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                />
              </div>

              {/* サービス名 */}
              <div>
                <FloatingInput
                  label="サービス名 *"
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  例：「ふらっと。」「グルメ王」- 管理画面で表示されるサービスの名前
                </p>
              </div>

              {/* スラッグ */}
              <div>
                <FloatingInput
                  label="スラッグ（英数字とハイフンのみ）*"
                  value={formData.slug}
                  onChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  例：<code className="bg-gray-100 px-1 rounded">furatto</code>, <code className="bg-gray-100 px-1 rounded">gourmet-king</code> - URL用の識別子（変更不可になるため慎重に設定してください）
                </p>
              </div>

              {/* サブドメイン */}
              <div>
                <FloatingInput
                  label="サブドメイン"
                  value={formData.subdomain}
                  onChange={(value) => setFormData({ ...formData, subdomain: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  例：<code className="bg-gray-100 px-1 rounded">furatto</code> → <code className="bg-blue-100 px-1 rounded">furatto.pixseo.cloud</code> で公開されます<br />
                  <span className="text-gray-400">※ 空欄の場合はスラッグが使用されます</span>
                </p>
              </div>

              {/* カスタムドメイン */}
              <div>
                <FloatingInput
                  label="カスタムドメイン"
                  value={formData.customDomain}
                  onChange={(value) => setFormData({ ...formData, customDomain: value })}
                  placeholder="example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  例：<code className="bg-gray-100 px-1 rounded">furatto.com</code>, <code className="bg-gray-100 px-1 rounded">the-gourmet.jp</code><br />
                  <span className="text-gray-400">※ 顧客独自のドメインを設定する場合に入力（DNS設定が別途必要）</span>
                </p>
              </div>

              {/* サイト名 */}
              <div>
                <FloatingInput
                  label="サイト名（ユーザー向けサイトのタイトル）"
                  value={formData.siteName}
                  onChange={(value) => setFormData({ ...formData, siteName: value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  例：「ふらっと。- 旅行メディア」- ユーザー向けサイトの <code className="bg-gray-100 px-1 rounded">&lt;title&gt;</code> タグに表示<br />
                  <span className="text-gray-400">※ 空欄の場合はサービス名が使用されます</span>
                </p>
              </div>

              {/* サイト説明 */}
              <div>
                <FloatingInput
                  label="サイトの説明（SEO用メタディスクリプション）"
                  value={formData.siteDescription}
                  onChange={(value) => setFormData({ ...formData, siteDescription: value })}
                  multiline
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  例：「国内外の旅行情報を発信するメディアサイト」- 検索エンジン結果に表示される説明文
                </p>
              </div>
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
              className="bg-orange-500 text-white w-14 h-14 rounded-full hover:bg-orange-600 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
