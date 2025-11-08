'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import RichTextEditor from '@/components/admin/RichTextEditor';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import FloatingInput from '@/components/admin/FloatingInput';
import { createArticle } from '@/lib/firebase/articles-admin';
import { Category, Tag } from '@/types/article';
import { useEffect } from 'react';

export default function NewArticlePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
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
        console.log('[NewArticlePage] Fetching categories and tags...');
        
        const [categoriesResponse, tagsResponse] = await Promise.all([
          fetch('/api/admin/categories'),
          fetch('/api/admin/tags'),
        ]);
        
        if (!categoriesResponse.ok || !tagsResponse.ok) {
          throw new Error('Failed to fetch categories or tags');
        }
        
        const [categoriesData, tagsData] = await Promise.all([
          categoriesResponse.json(),
          tagsResponse.json(),
        ]);
        
        setCategories(categoriesData);
        setTags(tagsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('カテゴリーとタグの読み込みに失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.slug || !formData.authorName) {
      alert('タイトル、本文、スラッグ、著者名は必須です');
      return;
    }

    setLoading(true);
    try {
      await createArticle({
        ...formData,
        authorId: 'admin', // TODO: 実際のユーザーIDを使用
      });
      
      alert('記事を作成しました');
      router.push('/admin/articles');
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
            <p className="mt-2 text-gray-600">カテゴリーとタグを読み込み中...</p>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl">
          <form id="article-new-form" onSubmit={handleSubmit} className="space-y-6">
            {/* アイキャッチ画像（一番上） */}
            <FeaturedImageUpload
              value={formData.featuredImage}
              onChange={(url) => setFormData({ ...formData, featuredImage: url })}
            />

            {/* タイトル */}
            <FloatingInput
              label="タイトル"
              value={formData.title}
              onChange={(value) => setFormData({ ...formData, title: value })}
              required
            />

            {/* スラッグ */}
            <div className="relative bg-white rounded-lg p-6">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="article-slug"
                    required
                    className="w-full px-4 pt-8 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 peer"
                  />
                  <label
                    className={`absolute left-10 transition-all pointer-events-none ${
                      formData.slug.length > 0
                        ? 'text-xs top-2 bg-white px-2 text-gray-700'
                        : 'text-sm top-8 text-gray-500'
                    } peer-focus:text-xs peer-focus:top-2 peer-focus:bg-white peer-focus:px-2 peer-focus:text-gray-700`}
                  >
                    スラッグ（URL） <span className="text-red-500">*</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={generateSlug}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 h-12"
                >
                  自動生成
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                URL: /media/articles/{formData.slug || 'article-slug'}
              </p>
            </div>

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
            <div className="bg-white rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                本文 *
              </label>
              <RichTextEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
              />
            </div>

            {/* カテゴリー・タグ */}
            <div className="bg-white rounded-lg p-6 space-y-6">
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

            {/* 公開設定（フローティングエリア） */}
            <div className="fixed bottom-8 right-32 bg-white rounded-full px-6 py-3 shadow-lg z-50">
              <label className="flex items-center cursor-pointer">
                <span className="text-sm font-medium text-gray-700 mr-3">
                  {formData.isPublished ? '公開中' : '非公開'}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                    className={`block w-14 h-8 rounded-full transition-colors ${
                      formData.isPublished ? 'bg-orange-500' : 'bg-gray-400'
                    }`}
                  >
                    <div
                      className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                        formData.isPublished ? 'transform translate-x-6' : ''
                      }`}
                    />
                  </div>
                </div>
              </label>
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
                className="bg-orange-500 text-white w-14 h-14 rounded-full hover:bg-orange-600 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="記事を作成"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

