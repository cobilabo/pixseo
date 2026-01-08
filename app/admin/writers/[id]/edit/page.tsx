'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { Writer } from '@/types/writer';
import { FormActions } from '@/components/admin/common';

export default function EditWriterPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    iconUrl: '',
    iconAlt: '',
    backgroundImageUrl: '',
    backgroundImageAlt: '',
    handleName: '',
    bio: '',
  });

  useEffect(() => {
    const fetchWriter = async () => {
      try {
        const response = await fetch(`/api/admin/writers/${params.id}`);
        if (response.ok) {
          const data: Writer = await response.json();
          setFormData({
            iconUrl: data.icon || '',
            iconAlt: data.iconAlt || '',
            backgroundImageUrl: data.backgroundImage || '',
            backgroundImageAlt: data.backgroundImageAlt || '',
            handleName: data.handleName || '',
            bio: data.bio || '',
          });
        }
      } catch (error) {
        console.error('Error fetching writer:', error);
        alert('ライター情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchWriter();
  }, [params.id]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/writers/${params.id}`, {
        method: 'PUT',
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
        }),
      });

      if (response.ok) {
        alert('ライターを更新しました');
        router.push('/writers');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'ライター更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating writer:', error);
      alert(error.message || 'ライターの更新に失敗しました');
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
              submitTitle="ライターを更新"
            />
          </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
