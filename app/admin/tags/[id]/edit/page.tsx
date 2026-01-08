'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import { getTagById } from '@/lib/firebase/tags-admin';
import { Tag } from '@/types/article';
import { FormActions, SlugInput } from '@/components/admin/common';

export default function EditTagPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [tag, setTag] = useState<Tag | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tagData = await getTagById(params.id);
        
        if (!tagData) {
          alert('タグが見つかりません');
          router.push('/tags');
          return;
        }

        setTag(tagData);
        setFormData({
          name: tagData.name,
          slug: tagData.slug,
        });
      } catch (error) {
        console.error('Error fetching tag:', error);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    
    if (!formData.name || !formData.slug) {
      alert('タグ名とスラッグは必須です');
      return;
    }

    if (!tag) {
      alert('タグデータの読み込みに失敗しました');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/tags/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: params.id,
          ...formData,
          mediaId: tag.mediaId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tag');
      }
      
      alert('タグを更新しました');
      router.push('/tags');
    } catch (error) {
      console.error('Error updating tag:', error);
      alert('タグの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="max-w-4xl pb-32 animate-fadeIn">
            <form id="tag-edit-form" onSubmit={handleSubmit}>
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
              submitTitle="タグを更新"
            />
          </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
