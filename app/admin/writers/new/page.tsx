'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { FormActions } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';

export default function NewWriterPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    iconUrl: '',
    iconAlt: '',
    backgroundImageUrl: '',
    backgroundImageAlt: '',
    handleName: '',
    bio: '',
  });

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!currentTenant) {
      showError('サービスが選択されていません。ライターを作成できません。');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/writers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          icon: formData.iconUrl,
          iconAlt: formData.iconAlt,
          backgroundImage: formData.backgroundImageUrl,
          backgroundImageAlt: formData.backgroundImageAlt,
          handleName: formData.handleName,
          bio: formData.bio,
          mediaId: currentTenant.id,
        }),
      });

      if (response.ok) {
        showSuccess('ライターを作成しました');
        router.push('/writers');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'ライター作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Error creating writer:', error);
      showError(error.message || 'ライターの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32 animate-fadeIn">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl p-6 space-y-6">
              <FeaturedImageUpload
                value={formData.iconUrl}
                onChange={(url) => setFormData({ ...formData, iconUrl: url })}
                alt={formData.iconAlt}
                onAltChange={(alt) => setFormData({ ...formData, iconAlt: alt })}
                label="アイコン画像"
              />

              <FeaturedImageUpload
                value={formData.backgroundImageUrl}
                onChange={(url) => setFormData({ ...formData, backgroundImageUrl: url })}
                alt={formData.backgroundImageAlt}
                onAltChange={(alt) => setFormData({ ...formData, backgroundImageAlt: alt })}
                label="背景画像"
              />

              <FloatingInput
                label="ハンドルネーム *"
                value={formData.handleName}
                onChange={(value) => setFormData({ ...formData, handleName: value })}
                required
              />

              <FloatingInput
                label="紹介文"
                value={formData.bio}
                onChange={(value) => setFormData({ ...formData, bio: value })}
                multiline
                rows={4}
              />
            </div>
          </form>

          <FormActions
            loading={loading}
            onSubmit={handleSubmit}
            submitTitle="ライター作成"
          />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
