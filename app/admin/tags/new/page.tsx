'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { FormActions, SlugInput } from '@/components/admin/common';

export default function NewTagPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    
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

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32 animate-fadeIn">
          <form id="tag-new-form" onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl p-6 space-y-6">
              <FloatingInput
                label="タグ名 *"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              <SlugInput
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value })}
                sourceName={formData.name}
                type="tag"
              />
            </div>
          </form>

          <FormActions
            loading={loading}
            onSubmit={handleSubmit}
            submitTitle="タグを作成"
          />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
