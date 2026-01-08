'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { FormActions, SlugInput, AITextareaInput, Toggle } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';

export default function NewCategoryPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    imageAlt: '',
    isRecommended: false,
    order: 0,
  });

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    
    if (!formData.name || !formData.slug) {
      showError('カテゴリー名とスラッグは必須です');
      return;
    }

    if (!currentTenant) {
      showError('メディアテナントが選択されていません');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories/create', {
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
        throw new Error(errorData.error || 'Failed to create category');
      }
      
      showSuccess('カテゴリーを作成しました');
      router.push('/categories');
    } catch (error) {
      console.error('Error creating category:', error);
      showError('カテゴリーの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32 animate-fadeIn">
          <form id="category-new-form" onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl p-6 space-y-6">
              <FloatingInput
                label="カテゴリー名 *"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              <SlugInput
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value })}
                sourceName={formData.name}
                type="category"
              />

              <AITextareaInput
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                sourceName={formData.name}
                apiEndpoint="/api/admin/categories/generate-description"
                label="説明（SEO用: 120-180文字推奨）"
                buttonTitle="説明文をAI自動生成"
              />

              <FeaturedImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                alt={formData.imageAlt}
                onAltChange={(alt) => setFormData({ ...formData, imageAlt: alt })}
                label="カテゴリー画像"
                showImageGenerator={true}
                imageGeneratorTitle={`${formData.name}カテゴリー`}
                imageGeneratorContent={formData.description}
              />
            </div>
          </form>

          {/* フローティング: おすすめトグル */}
          <div className="fixed bottom-32 right-8 w-32 z-50">
            <div className="bg-white rounded-full px-6 py-3 shadow-custom">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  おすすめ
                </span>
                <Toggle
                  checked={formData.isRecommended}
                  onChange={(checked) => setFormData({ ...formData, isRecommended: checked })}
                />
              </div>
            </div>
          </div>

          <FormActions
            loading={loading}
            onSubmit={handleSubmit}
            submitTitle="カテゴリーを作成"
          />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
