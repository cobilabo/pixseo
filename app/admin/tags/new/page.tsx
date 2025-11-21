'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import { createTag } from '@/lib/firebase/tags-admin';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function NewTagPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      alert('タグ名とスラッグは必須です');
      return;
    }

    if (!currentTenant) {
      alert('メディアテナントが選択されていません');
      return;
    }

    setLoading(true);
    try {
      // API経由で作成（翻訳処理を含む）
      const response = await fetch('/api/admin/tags/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          mediaId: currentTenant.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tag');
      }
      
      alert('タグを作成しました');
      router.push('/tags');
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('タグの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = async () => {
    if (!formData.name) {
      alert('タグ名を入力してください');
      return;
    }

    setGeneratingSlug(true);
    try {
      const response = await fetch('/api/admin/generate-slug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: 'tag',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate slug');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, slug: data.slug }));
    } catch (error) {
      console.error('Error generating slug:', error);
      alert('スラッグの生成に失敗しました');
    } finally {
      setGeneratingSlug(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32 animate-fadeIn">
          <form id="tag-new-form" onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl p-6 space-y-6">
              {/* タグ名 */}
              <FloatingInput
                label="タグ名 *"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              {/* スラッグ */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <FloatingInput
                    label="スラッグ（英数字とハイフンのみ）*"
                    value={formData.slug}
                    onChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={generateSlug}
                  disabled={generatingSlug || !formData.name}
                  className="mt-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white w-12 h-12 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="AIで英語スラッグを生成"
                >
                  {generatingSlug ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
                  )}
                </button>
              </div>
            </div>
          </form>

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

            {/* 作成ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-custom"
              title="タグを作成"
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

