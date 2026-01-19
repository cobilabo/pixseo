'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import { getCustomBlockById, updateCustomBlock } from '@/lib/firebase/custom-blocks-admin';
import { useToast } from '@/contexts/ToastContext';

export default function EditCustomBlockPage() {
  const router = useRouter();
  const params = useParams();
  const blockId = params.id as string;
  const { showSuccessAndNavigate, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    html: '',
    css: '',
  });

  useEffect(() => {
    fetchCustomBlock();
  }, [blockId]);

  const fetchCustomBlock = async () => {
    try {
      const block = await getCustomBlockById(blockId);
      if (!block) {
        showError('カスタムブロックが見つかりません');
        router.push('/admin/custom-blocks');
        return;
      }

      setFormData({
        name: block.name,
        html: block.html,
        css: block.css,
      });
      setFetchLoading(false);
    } catch (error) {
      console.error('Error fetching custom block:', error);
      showError('カスタムブロックの取得に失敗しました');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.html) {
      showError('ブロック名とHTMLは必須です');
      return;
    }

    setLoading(true);
    try {
      await updateCustomBlock(blockId, {
        name: formData.name,
        html: formData.html,
        css: formData.css,
      });
      
      showSuccessAndNavigate('カスタムブロックを更新しました', '/admin/custom-blocks');
    } catch (error) {
      console.error('Error updating custom block:', error);
      showError('カスタムブロックの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="px-4 pb-32 animate-fadeIn">
          <form onSubmit={handleSubmit}>
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">カスタムブロック編集</h1>
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
                  {loading ? '更新中...' : '更新'}
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
