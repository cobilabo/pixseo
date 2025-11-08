'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import RichTextEditor from '@/components/admin/RichTextEditor';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FloatingMultiSelect from '@/components/admin/FloatingMultiSelect';
import { Category, Tag, Article } from '@/types/article';
import { Writer } from '@/types/writer';
import { apiGet } from '@/lib/api-client';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
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
        console.log('[EditArticlePage] Fetching article data...');
        
        const [articleData, categoriesData, tagsData, writersData] = await Promise.all([
          fetch(`/api/admin/articles/${params.id}`).then(r => r.json()),
          apiGet<Category[]>('/api/admin/categories'),
          apiGet<Tag[]>('/api/admin/tags'),
          apiGet<Writer[]>('/api/admin/writers'),
        ]);
        
        console.log('[EditArticlePage] Received article:', articleData);
        
        // 日付をDateオブジェクトに変換
        articleData.publishedAt = new Date(articleData.publishedAt);
        articleData.updatedAt = new Date(articleData.updatedAt);

        setArticle(articleData);
        setFeaturedImageUrl(articleData.featuredImage || '');
        setFormData({
          title: articleData.title,
          content: articleData.content,
          excerpt: articleData.excerpt || '',
          slug: articleData.slug,
          writerId: articleData.writerId || '',
          categoryIds: articleData.categoryIds,
          tagIds: articleData.tagIds,
          isPublished: articleData.isPublished,
          isFeatured: articleData.isFeatured || false,
          metaTitle: articleData.metaTitle || '',
          metaDescription: articleData.metaDescription || '',
          googleMapsUrl: articleData.googleMapsUrl || '',
          reservationUrl: articleData.reservationUrl || '',
        });
        
        setCategories(categoriesData);
        setTags(tagsData);
        setWriters(writersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('記事の読み込みに失敗しました');
        router.push('/articles');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    console.log('[handleSubmit] 記事更新処理を開始');
    
    if (!formData.title || !formData.content || !formData.slug || !formData.writerId) {
      alert('タイトル、本文、スラッグ、ライターは必須です');
      return;
    }

    if (!article) {
      alert('記事データの読み込みに失敗しました');
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
      const response = await fetch(`/api/admin/articles/${params.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          authorName: selectedWriter.handleName,
          featuredImage: featuredImageUrl,
          mediaId: article.mediaId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`更新に失敗しました: ${response.status}`);
      }

      console.log('[handleSubmit] 更新成功');
      alert('記事を更新しました');
      router.push('/articles');
    } catch (error) {
      console.error('[handleSubmit] 更新エラー:', error);
      alert('記事の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!currentTenant || !formData.slug) {
      alert('プレビューにはサービスとスラッグが必要です');
      return;
    }
    
    // {slug}.pixseo.cloud/articles/{slug}
    const previewUrl = `https://${currentTenant.slug}.pixseo.cloud/articles/${formData.slug}`;
    window.open(previewUrl, '_blank');
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="max-w-4xl pb-32 animate-fadeIn">
          <form id="article-edit-form" onSubmit={handleSubmit}>
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

                      {/* プレビューボタン */}
                      {formData.isPublished && (
                        <button
                          type="button"
                          onClick={handlePreview}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-blue-600 w-12 h-12 rounded-full flex items-center justify-center hover:bg-blue-50"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
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

              {/* スラッグ - プレースホルダーなし */}
              <FloatingInput
                label="スラッグ（URL）"
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value })}
                required
              />

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

            {/* 更新ボタン */}
            <button
              type="submit"
              disabled={loading}
              form="article-edit-form"
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="記事を更新"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
