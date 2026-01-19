'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import { createCustomBlock } from '@/lib/firebase/custom-blocks-admin';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';

export default function NewCustomBlockPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const { showSuccessAndNavigate, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    html: '',
    css: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.html) {
      showError('ブロック名とHTMLは必須です');
      return;
    }

    if (!currentTenant) {
      showError('メディアテナントが選択されていません');
      return;
    }

    setLoading(true);
    try {
      await createCustomBlock({
        mediaId: currentTenant.id,
        name: formData.name,
        html: formData.html,
        css: formData.css,
      });
      
      showSuccessAndNavigate('カスタムブロックを作成しました', '/admin/custom-blocks');
    } catch (error) {
      console.error('Error creating custom block:', error);
      showError('カスタムブロックの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="px-4 pb-32 animate-fadeIn">
          <form onSubmit={handleSubmit}>
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">カスタムブロック新規作成</h1>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  disabled={loading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '作成中...' : '作成'}
                </button>
              </div>
            </div>

            {/* フォーム */}
            <div className="bg-white rounded-[1.75rem] p-8 space-y-6">
              {/* ブロック名 */}
              <FloatingInput
                label="ブロック名"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              {/* HTML */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.html}
                  onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={12}
                  placeholder="<div>...</div>"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  カスタムブロックのHTMLコードを入力してください
                </p>
              </div>

              {/* CSS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSS
                </label>
                <textarea
                  value={formData.css}
                  onChange={(e) => setFormData({ ...formData, css: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={8}
                  placeholder=".custom-block { ... }"
                />
                <p className="text-xs text-gray-500 mt-2">
                  カスタムブロック専用のCSSを入力してください（オプション）
                </p>
              </div>
            </div>
          </form>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
