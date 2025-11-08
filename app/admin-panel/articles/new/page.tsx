'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import RichTextEditor from '@/components/admin/RichTextEditor';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FloatingMultiSelect from '@/components/admin/FloatingMultiSelect';
import { createArticle } from '@/lib/firebase/articles-admin';
import { Category, Tag } from '@/types/article';
import { Writer } from '@/types/writer';
import { useEffect } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiGet } from '@/lib/api-client';

export default function NewArticlePage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    writerId: '',
    categoryIds: [] as string[],
    tagIds: [] as string[],
    isPublished: false,
    isFeatured: false,
    metaTitle: '',
    metaDescription: '',
    googleMapsUrl: '',
    reservationUrl: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[NewArticlePage] Fetching categories, tags, and writers...');
        
        const [categoriesData, tagsData, writersData] = await Promise.all([
          apiGet<Category[]>('/api/admin/categories'),
          apiGet<Tag[]>('/api/admin/tags'),
          apiGet<Writer[]>('/api/admin/writers'),
        ]);
        
        setCategories(categoriesData);
        setTags(tagsData);
        setWriters(writersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('カテゴリー・タグ・ライターの読み込みに失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.slug || !formData.writerId) {
      alert('タイトル、本文、スラッグ、ライターは必須です');
      return;
    }

    if (!currentTenant) {
      alert('メディアテナントが選択されていません');
      return;
    }

    // ライター名を取得
    const selectedWriter = writers.find(w => w.id === formData.writerId);
    if (!selectedWriter) {
      alert('選択されたライターが見つかりません');
      return;
    }

    setLoading(true);
    try {
      await createArticle({
        ...formData,
        authorId: 'admin', // TODO: 実際のユーザーIDを使用
        authorName: selectedWriter.handleName,
        featuredImage: featuredImageUrl,
        mediaId: currentTenant.id,
      });
      
      alert('記事を作成しました');
      router.push('/articles');
    } catch (error) {
      console.error('Error creating article:', error);
      alert('記事の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData({ ...formData, slug });
  };

  if (fetchLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">データを読み込み中...</p>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32">
          <form id="article-new-form" onSubmit={handleSubmit}>
            {/* アイキャッチ画像（一番上・横長いっぱい） */}
            <div className="mb-6">
              <div className="relative w-full h-64 bg-white rounded-xl overflow-hidden">
                {featuredImageUrl ? (
                  <div className="relative w-full h-full group">
                    <img 
                      src={featuredImageUrl} 
                      alt="Featured" 
                      className="w-full h-full object-cover"
                    />
                    {/* ホバー時のオーバーレイ */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-4">
                      {/* 変更ボタン */}
                      <label className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100 cursor-pointer">
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const formDataUpload = new FormData();
                            formDataUpload.append('file', file);
                            
                            try {
                              const response = await fetch('/api/admin/upload-image', {
                                method: 'POST',
                                body: formDataUpload,
                                headers: {
                                  'x-media-id': currentTenant?.id || '',
                                },
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                setFeaturedImageUrl(data.url);
                              }
                            } catch (error) {
                              console.error('Error uploading image:', error);
                              alert('画像のアップロードに失敗しました');
                            }
                          }}
                        />
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </label>

                      {/* 削除ボタン */}
                      <button
                        type="button"
                        onClick={() => setFeaturedImageUrl('')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-red-600 w-12 h-12 rounded-full flex items-center justify-center hover:bg-red-50"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">アイキャッチ画像を選択</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const formDataUpload = new FormData();
                        formDataUpload.append('file', file);
                        
                        try {
                          const response = await fetch('/api/admin/upload-image', {
                            method: 'POST',
                            body: formDataUpload,
                            headers: {
                              'x-media-id': currentTenant?.id || '',
                            },
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            setFeaturedImageUrl(data.url);
                          }
                        } catch (error) {
                          console.error('Error uploading image:', error);
                          alert('画像のアップロードに失敗しました');
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* すべてのフィールドを1つのパネル内に表示 */}
            <div className="bg-white rounded-xl p-6 space-y-6">
              {/* タイトル */}
              <FloatingInput
                label="タイトル"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                required
              />

              {/* スラッグ - 自動生成ボタン付き・プレースホルダーなし */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <FloatingInput
                    label="スラッグ（URL）"
                    value={formData.slug}
                    onChange={(value) => setFormData({ ...formData, slug: value })}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={generateSlug}
                  className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 h-12 mb-0.5"
                >
                  自動生成
                </button>
              </div>

              {/* ライター選択 */}
              <FloatingSelect
                label="ライター"
                value={formData.writerId}
                onChange={(value) => setFormData({ ...formData, writerId: value })}
                options={[
                  { value: '', label: 'ライターを選択してください' },
                  ...writers.map(writer => ({
                    value: writer.id,
                    label: writer.handleName,
                  })),
                ]}
                required
              />

              {/* 抜粋 */}
              <FloatingInput
                label="抜粋"
                value={formData.excerpt}
                onChange={(value) => setFormData({ ...formData, excerpt: value })}
                multiline
                rows={3}
              />

              {/* 本文 */}
              <div>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                />
              </div>

              {/* Googleマップ URL */}
              <FloatingInput
                label="Googleマップ URL"
                value={formData.googleMapsUrl}
                onChange={(value) => setFormData({ ...formData, googleMapsUrl: value })}
                type="url"
              />

              {/* 予約サイト URL */}
              <FloatingInput
                label="予約サイト URL"
                value={formData.reservationUrl}
                onChange={(value) => setFormData({ ...formData, reservationUrl: value })}
                type="url"
              />

              {/* カテゴリー */}
              <FloatingMultiSelect
                label="カテゴリー"
                values={formData.categoryIds}
                onChange={(values) => setFormData({ ...formData, categoryIds: values })}
                options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              />

              {/* タグ */}
              <FloatingMultiSelect
                label="タグ"
                values={formData.tagIds}
                onChange={(values) => setFormData({ ...formData, tagIds: values })}
                options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
              />

              {/* メタタイトル */}
              <FloatingInput
                label="メタタイトル"
                value={formData.metaTitle}
                onChange={(value) => setFormData({ ...formData, metaTitle: value })}
              />

              {/* メタディスクリプション */}
              <FloatingInput
                label="メタディスクリプション"
                value={formData.metaDescription}
                onChange={(value) => setFormData({ ...formData, metaDescription: value })}
                multiline
                rows={3}
              />
            </div>
          </form>

          {/* トグルエリア（固定位置・横幅をボタンに合わせる・距離を半分に） */}
          <div className="fixed bottom-36 right-8 w-32 space-y-4 z-50">
            {/* おすすめトグル */}
            <div className="bg-white rounded-full px-6 py-3 shadow-lg">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">おすすめ</span>
                <label className="cursor-pointer">
                  <div className="relative inline-block w-14 h-8">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured || false}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="sr-only"
                    />
                    <div 
                      className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
                        formData.isFeatured ? 'bg-blue-600' : 'bg-gray-400'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        formData.isFeatured ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 公開トグル */}
            <div className="bg-white rounded-full px-6 py-3 shadow-lg">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">公開</span>
                <label className="cursor-pointer">
                  <div className="relative inline-block w-14 h-8">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="sr-only"
                    />
                    <div 
                      className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
                        formData.isPublished ? 'bg-blue-600' : 'bg-gray-400'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        formData.isPublished ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            {/* キャンセルボタン */}
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center"
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
              form="article-new-form"
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="記事を作成"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
