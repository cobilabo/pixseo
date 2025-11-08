'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import RichTextEditor from '@/components/admin/RichTextEditor';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import FloatingInput from '@/components/admin/FloatingInput';
import { updateArticle } from '@/lib/firebase/articles-admin';
import { Category, Tag, Article } from '@/types/article';

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    authorName: '',
    categoryIds: [] as string[],
    tagIds: [] as string[],
    featuredImage: '',
    isPublished: false,
    metaTitle: '',
    metaDescription: '',
    googleMapsUrl: '',
    reservationUrl: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[EditArticlePage] Fetching article data...');
        
        // Admin SDK経由でサーバーサイドから取得（API Route）
        const [articleResponse, categoriesResponse, tagsResponse] = await Promise.all([
          fetch(`/api/admin/articles/${params.id}`),
          fetch('/api/admin/categories'),
          fetch('/api/admin/tags'),
        ]);
        
        if (!articleResponse.ok) {
          throw new Error(`記事の取得に失敗しました: ${articleResponse.status}`);
        }
        if (!categoriesResponse.ok) {
          throw new Error(`カテゴリーの取得に失敗しました: ${categoriesResponse.status}`);
        }
        if (!tagsResponse.ok) {
          throw new Error(`タグの取得に失敗しました: ${tagsResponse.status}`);
        }
        
        const [articleData, categoriesData, tagsData] = await Promise.all([
          articleResponse.json(),
          categoriesResponse.json(),
          tagsResponse.json(),
        ]);
        console.log('[EditArticlePage] Received article:', articleData);
        
        // 日付をDateオブジェクトに変換
        articleData.publishedAt = new Date(articleData.publishedAt);
        articleData.updatedAt = new Date(articleData.updatedAt);

        setArticle(articleData);
        setFormData({
          title: articleData.title,
          content: articleData.content,
          excerpt: articleData.excerpt || '',
          slug: articleData.slug,
          authorName: articleData.authorName,
          categoryIds: articleData.categoryIds,
          tagIds: articleData.tagIds,
          featuredImage: articleData.featuredImage || '',
          isPublished: articleData.isPublished,
          metaTitle: articleData.metaTitle || '',
          metaDescription: articleData.metaDescription || '',
          googleMapsUrl: articleData.googleMapsUrl || '',
          reservationUrl: articleData.reservationUrl || '',
        });
        
        setCategories(categoriesData);
        setTags(tagsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('記事の読み込みに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        router.push('/admin/articles');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    console.log('[handleSubmit] 記事更新処理を開始');
    console.log('[handleSubmit] フォームデータ:', formData);
    
    if (!formData.title || !formData.content || !formData.slug || !formData.authorName) {
      console.error('[handleSubmit] 必須項目が不足しています');
      alert('タイトル、本文、スラッグ、著者名は必須です');
      return;
    }

    setLoading(true);
    console.log('[handleSubmit] ローディング開始');
    
    try {
      console.log('[handleSubmit] updateArticle関数を呼び出し中...', params.id);
      const result = await updateArticle(params.id, formData);
      console.log('[handleSubmit] 更新成功:', result);
      
      alert('記事を更新しました');
      console.log('[handleSubmit] 記事一覧ページにリダイレクト');
      router.push('/admin/articles');
    } catch (error) {
      console.error('[handleSubmit] 更新エラー:', error);
      alert('記事の更新に失敗しました');
    } finally {
      setLoading(false);
      console.log('[handleSubmit] ローディング終了');
    }
  };

  if (fetchLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32">
          <form id="article-edit-form" onSubmit={handleSubmit}>
            {/* すべてのフィールドを1つのパネル内に表示 */}
            <div className="bg-white rounded-lg p-6 space-y-6">
              {/* タイトル */}
              <FloatingInput
                label="タイトル"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                required
              />

              {/* スラッグ */}
              <FloatingInput
                label="スラッグ（URL）"
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value })}
                placeholder="article-slug"
                required
              />

              {/* 著者名 */}
              <FloatingInput
                label="著者名"
                value={formData.authorName}
                onChange={(value) => setFormData({ ...formData, authorName: value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  本文 *
                </label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  カテゴリー
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isSelected = formData.categoryIds.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              categoryIds: formData.categoryIds.filter((id) => id !== category.id),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              categoryIds: [...formData.categoryIds, category.id],
                            });
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
                {categories.length === 0 && (
                  <p className="text-sm text-gray-500">カテゴリーがまだありません</p>
                )}
              </div>

              {/* タグ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  タグ
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = formData.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              tagIds: formData.tagIds.filter((id) => id !== tag.id),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              tagIds: [...formData.tagIds, tag.id],
                            });
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
                {tags.length === 0 && (
                  <p className="text-sm text-gray-500">タグがまだありません</p>
                )}
              </div>

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

          {/* おすすめトグル（フローティング） */}
          <div className="fixed bottom-48 right-8 bg-white rounded-full px-6 py-3 shadow-lg z-50">
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
                    onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                    className={`absolute inset-0 rounded-full transition-colors cursor-pointer ${
                      formData.isFeatured ? 'bg-orange-500' : 'bg-gray-400'
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

          {/* 公開トグル（フローティング） */}
          <div className="fixed bottom-24 right-8 bg-white rounded-full px-6 py-3 shadow-lg z-50">
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
                    onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                    className={`absolute inset-0 rounded-full transition-colors cursor-pointer ${
                      formData.isPublished ? 'bg-orange-500' : 'bg-gray-400'
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
              type="button"
              onClick={(e) => {
                console.log('[更新ボタン] クリックされました');
                e.preventDefault();
                const form = document.getElementById('article-edit-form') as HTMLFormElement;
                console.log('[更新ボタン] フォーム要素:', form);
                
                if (form && form.checkValidity()) {
                  console.log('[更新ボタン] フォームバリデーション成功、handleSubmitを呼び出します');
                  // FormEventを作成してhandleSubmitを呼び出す
                  const syntheticEvent = {
                    preventDefault: () => {},
                    currentTarget: form,
                    target: form,
                  } as unknown as FormEvent<HTMLFormElement>;
                  handleSubmit(syntheticEvent);
                } else {
                  console.error('[更新ボタン] フォームバリデーション失敗');
                  form?.reportValidity();
                }
              }}
              disabled={loading}
              className="bg-orange-500 text-white w-14 h-14 rounded-full hover:bg-orange-600 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="記事を更新"
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

