'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { Writer } from '@/types/writer';
import { FormActions } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';
import { fetchWithMediaId } from '@/lib/api-client';

export default function EditWriterPage() {
  const params = useParams();
  const writerId = (params?.id as string) || '';
  const { showSuccessAndNavigate, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [writerCountForMedia, setWriterCountForMedia] = useState(1);
  const [formData, setFormData] = useState({
    iconUrl: '',
    iconAlt: '',
    backgroundImageUrl: '',
    backgroundImageAlt: '',
    handleName: '',
    bio: '',
    isMainWriter: false,
  });

  useEffect(() => {
    const fetchWriter = async () => {
      try {
        const response = await fetchWithMediaId(`/api/admin/writers/${writerId}`);
        if (response.ok) {
          const data: Writer = await response.json();
          setFormData({
            iconUrl: (data.icon || '').trim(),
            iconAlt: (data.iconAlt || '').trim(),
            backgroundImageUrl: (data.backgroundImage || '').trim(),
            backgroundImageAlt: (data.backgroundImageAlt || '').trim(),
            handleName: data.handleName || '',
            bio: data.bio || '',
            isMainWriter: data.isMainWriter ?? false,
          });
          setWriterCountForMedia(data.writerCountForMedia ?? 1);
        }
      } catch (error) {
        console.error('Error fetching writer:', error);
        showError('ライター情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    if (!writerId) return;
    fetchWriter();
  }, [writerId]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    setLoading(true);

    try {
      const response = await fetchWithMediaId(`/api/admin/writers/${writerId}`, {
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
          isMainWriter:
            writerCountForMedia === 1 ? true : formData.isMainWriter,
        }),
      });

      if (response.ok) {
        showSuccessAndNavigate('ライターを更新しました', '/admin/writers');
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as { error?: string }).error || 'ライター更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating writer:', error);
      showError(error.message || 'ライターの更新に失敗しました');
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

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={writerCountForMedia === 1 ? true : formData.isMainWriter}
                      disabled={writerCountForMedia === 1}
                      onChange={(e) =>
                        setFormData({ ...formData, isMainWriter: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <span className="text-sm font-medium text-gray-900">メインライターに設定</span>
                  </label>
                  {writerCountForMedia === 1 ? (
                    <p className="text-xs text-gray-500">
                      ライターが1名のみのときは常にメインです。メインを外すには別のライターを追加してください。
                    </p>
                  ) : null}
                </div>

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
