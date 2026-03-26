'use client';

import { useState, FormEvent, useEffect } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { FormActions } from '@/components/admin/common';
import { useToast } from '@/contexts/ToastContext';
import { apiGet } from '@/lib/api-client';
import { Writer } from '@/types/writer';

export default function NewWriterPage() {
  const { currentTenant } = useMediaTenant();
  const { showSuccessAndNavigate, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingWriterCount, setExistingWriterCount] = useState<number | null>(null);
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
    let cancelled = false;
    (async () => {
      try {
        const list = await apiGet<Writer[]>('/api/admin/writers');
        if (!cancelled) {
          const n = list.length;
          setExistingWriterCount(n);
          setFormData((prev) => ({
            ...prev,
            isMainWriter: n === 0,
          }));
        }
      } catch {
        if (!cancelled) setExistingWriterCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!currentTenant) {
      showError('サービスが選択されていません。ライターを作成できません。');
      return;
    }

    if (existingWriterCount === null) {
      showError('ライター一覧を読み込み中です。しばらく待ってから再度お試しください。');
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
          isMainWriter:
            existingWriterCount === 0 ? true : formData.isMainWriter,
        }),
      });

      if (response.ok) {
        showSuccessAndNavigate('ライターを作成しました', '/admin/writers');
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

              {existingWriterCount !== null && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={existingWriterCount === 0 ? true : formData.isMainWriter}
                      disabled={existingWriterCount === 0}
                      onChange={(e) =>
                        setFormData({ ...formData, isMainWriter: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <span className="text-sm font-medium text-gray-900">メインライターに設定</span>
                  </label>
                  {existingWriterCount === 0 ? (
                    <p className="text-xs text-gray-500">
                      最初のライターは自動的にメインライターになります。
                    </p>
                  ) : null}
                </div>
              )}

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
