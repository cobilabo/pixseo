'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import RichTextEditor from '@/components/admin/RichTextEditor';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FloatingMultiSelect from '@/components/admin/FloatingMultiSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { Category, Tag, Article } from '@/types/article';
import { Writer } from '@/types/writer';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiGet } from '@/lib/api-client';
import { generateTableOfContents, calculateReadingTime } from '@/lib/article-utils';
import { cleanWordPressHtml } from '@/lib/cleanWordPressHtml';
import FAQManager from '@/components/admin/FAQManager';
import { FAQItem } from '@/types/article';

function NewArticlePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [serpPreviewDevice, setSerpPreviewDevice] = useState<'pc' | 'sp'>('pc');
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [generatingTags, setGeneratingTags] = useState(false);
  const [generatingMetaTitle, setGeneratingMetaTitle] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    writerId: '',
    categoryIds: [] as string[],
    tagIds: [] as string[], // 新規作成時は空、編集画面で設定
    relatedArticleIds: [] as string[],
    isPublished: false,
    isFeatured: false,
    metaTitle: '',
    metaDescription: '',
    googleMapsUrl: '',
    reservationUrl: '',
    faqs: [] as FAQItem[],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[NewArticlePage] Fetching categories, tags, writers, and articles...');
        
        const [categoriesData, tagsData, writersData, articlesData] = await Promise.all([
          apiGet<Category[]>('/api/admin/categories'),
          apiGet<Tag[]>('/api/admin/tags'),
          apiGet<Writer[]>('/api/admin/writers'),
          apiGet<Article[]>('/api/admin/articles'),
        ]);
        
        setCategories(categoriesData);
        setTags(tagsData);
        setWriters(writersData);
        setArticles(articlesData);

        // URLパラメータから生成されたデータを取得
        const titleParam = searchParams.get('title');
        const excerptParam = searchParams.get('excerpt');
        const contentParam = searchParams.get('content');
        const categoryIdsParam = searchParams.get('categoryIds');
        const tagIdsParam = searchParams.get('tagIds');
        const featuredImageParam = searchParams.get('featuredImage');

        if (titleParam || contentParam) {
          setFormData(prev => ({
            ...prev,
            title: titleParam || prev.title,
            excerpt: excerptParam || prev.excerpt,
            content: contentParam || prev.content,
            categoryIds: categoryIdsParam ? categoryIdsParam.split(',') : prev.categoryIds,
            tagIds: tagIdsParam ? tagIdsParam.split(',') : prev.tagIds,
          }));

          // アイキャッチ画像を設定
          if (featuredImageParam) {
            setFeaturedImageUrl(featuredImageParam);
          }

          // スラッグを自動生成（OpenAI API使用）
          if (titleParam) {
            generateSlugFromTitle(titleParam);
          }

          // URLパラメータをクリア（リロード時に再適用されないように）
          router.replace('/articles/new', { scroll: false });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('データの読み込みに失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [searchParams, router]);

  // タイトルが変更されたら自動的にスラッグを生成
  useEffect(() => {
    if (formData.title && !formData.slug) {
      generateSlugFromTitle(formData.title);
    }
  }, [formData.title]);

  const generateSlugFromTitle = async (title: string) => {
    if (!title.trim()) return;

    setGeneratingSlug(true);
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/articles/generate-slug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('スラッグの生成に失敗しました');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, slug: data.slug }));
    } catch (error) {
      console.error('Error generating slug:', error);
      // エラー時はフォールバック（簡易的なスラッグ生成）
      const fallbackSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
      setFormData(prev => ({ ...prev, slug: fallbackSlug }));
    } finally {
      setGeneratingSlug(false);
    }
  };

  const generateMetaTitle = async () => {
    if (!formData.title) return;

    setGeneratingMetaTitle(true);
    try {
      const response = await fetch('/api/admin/articles/generate-meta-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate meta title');
      }

      const data = await response.json();
      
      // metaTitleが空の場合のみ設定（既に入力されている場合は上書きしない）
      if (!formData.metaTitle) {
        setFormData(prev => ({ ...prev, metaTitle: data.metaTitle }));
      }
    } catch (error) {
      console.error('Error generating meta title:', error);
      // エラー時はフォールバック（タイトルをそのまま使用し、70文字にトリミング）
      if (!formData.metaTitle) {
        const fallbackMetaTitle = formData.title.length > 70 
          ? formData.title.substring(0, 67) + '...'
          : formData.title;
        setFormData(prev => ({ ...prev, metaTitle: fallbackMetaTitle }));
      }
    } finally {
      setGeneratingMetaTitle(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    console.log('[ArticleNew] handleSubmit called');
    console.log('[ArticleNew] featuredImageUrl:', featuredImageUrl);
    console.log('[ArticleNew] featuredImageAlt:', featuredImageAlt);
    
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
      // WordPress HTMLをクリーニング
      const cleanedContent = cleanWordPressHtml(formData.content);
      console.log('[handleSubmit] HTMLクリーニング完了');
      
      // 目次と読了時間を自動生成
      const tableOfContents = generateTableOfContents(cleanedContent);
      const readingTime = calculateReadingTime(cleanedContent);
      
      console.log('[handleSubmit] 目次:', tableOfContents);
      console.log('[handleSubmit] 読了時間:', readingTime, '分');
      
      // APIエンドポイント経由で作成（Algolia同期も含む）
      const response = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          content: cleanedContent, // クリーニング済みのコンテンツを使用
          writerId: formData.writerId, // ライターID（必須）
          featuredImage: featuredImageUrl,
          featuredImageAlt: featuredImageAlt, // alt属性を追加
          mediaId: currentTenant.id,
          tableOfContents,
          readingTime,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`作成に失敗しました: ${response.status}`);
      }
      
      console.log('[handleSubmit] 作成成功');
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
    if (formData.title) {
      generateSlugFromTitle(formData.title);
    }
  };

  const generateTagsFromContent = async () => {
    if (!formData.title && !formData.content) {
      alert('タイトルまたは本文を入力してください');
      return;
    }

    setGeneratingTags(true);
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/articles/generate-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          categoryIds: formData.categoryIds, // カテゴリーIDを渡してタグの重複を回避
        }),
      });

      if (!response.ok) {
        throw new Error('タグの生成に失敗しました');
      }

      const data = await response.json();
      const tagIds = data.tags.map((tag: any) => tag.id);
      
      setFormData(prev => ({ ...prev, tagIds }));
      
      // 生成されたタグをtagsステートに追加（新規タグがある場合）
      const newTags = data.tags.filter((tag: any) => !tag.isExisting);
      if (newTags.length > 0) {
        setTags(prevTags => [...prevTags, ...newTags.map((tag: any) => ({
          id: tag.id,
          mediaId: currentTenantId || '',
          name: tag.name,
          slug: tag.slug,
        }))]);
      }

      alert(
        `タグを生成しました！\n` +
        `合計: ${data.summary.total}個\n` +
        `既存タグ: ${data.summary.existing}個\n` +
        `新規タグ: ${data.summary.new}個`
      );
    } catch (error) {
      console.error('Error generating tags:', error);
      alert('タグの生成に失敗しました');
    } finally {
      setGeneratingTags(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="max-w-4xl pb-32 animate-fadeIn">
          <form id="article-new-form" onSubmit={handleSubmit}>
            {/* アイキャッチ画像（一番上・横長いっぱい） */}
            <div className="mb-6">
              <div className="bg-white rounded-xl p-6">
                <FeaturedImageUpload
                  value={featuredImageUrl}
                  onChange={(url) => {
                    console.log('[ArticleNew] onChange called with URL:', url);
                    console.log('[ArticleNew] Current featuredImageUrl:', featuredImageUrl);
                    setFeaturedImageUrl(url);
                    console.log('[ArticleNew] setFeaturedImageUrl called');
                  }}
                  alt={featuredImageAlt}
                  onAltChange={(alt) => {
                    console.log('[ArticleNew] onAltChange called with alt:', alt);
                    console.log('[ArticleNew] Current featuredImageAlt:', featuredImageAlt);
                    setFeaturedImageAlt(alt);
                    console.log('[ArticleNew] setFeaturedImageAlt called');
                  }}
                  showImageGenerator={true}
                  imageGeneratorTitle={formData.title}
                  imageGeneratorContent={formData.content}
                />
              </div>
            </div>

            {/* すべてのフィールドを1つのパネル内に表示 */}
            <div className="bg-white rounded-xl p-6 space-y-6">
              {/* カテゴリー */}
              <FloatingMultiSelect
                label="カテゴリー"
                values={formData.categoryIds}
                onChange={(values) => setFormData({ ...formData, categoryIds: values })}
                options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                badgeColor="green"
              />

              {/* タグ - AI自動生成ボタン付き */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <FloatingMultiSelect
                    label="タグ"
                    values={formData.tagIds}
                    onChange={(values) => setFormData({ ...formData, tagIds: values })}
                    options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
                    badgeColor="blue"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateTagsFromContent}
                  disabled={generatingTags || (!formData.title && !formData.content)}
                  className="w-12 h-12 mb-0.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="タグ自動生成"
                >
                  {generatingTags ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
                  )}
                </button>
              </div>

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
                  disabled={generatingSlug || !formData.title}
                  className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 h-12 mb-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingSlug ? '生成中...' : '自動生成'}
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

              {/* メタディスクリプション */}
              <FloatingInput
                label="メタディスクリプション"
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

              {/* メタタイトル */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <FloatingInput
                    label="メタタイトル（SEO用）"
                    value={formData.metaTitle}
                    onChange={(value) => setFormData({ ...formData, metaTitle: value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateMetaTitle}
                  disabled={generatingMetaTitle || !formData.title}
                  className="w-12 h-12 mb-0.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="メタタイトル自動生成"
                >
                  {generatingMetaTitle ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
                  )}
                </button>
              </div>

              {/* 関連記事 */}
              <FloatingMultiSelect
                label="関連記事（最大5件）"
                values={formData.relatedArticleIds}
                onChange={(values) => {
                  // 最大5件に制限
                  if (values.length <= 5) {
                    setFormData({ ...formData, relatedArticleIds: values });
                  }
                }}
                options={articles.map(a => ({ value: a.id, label: a.title }))}
                badgeColor="gray"
              />
            </div>
          </form>

          {/* FAQ管理 */}
          <div className="bg-white rounded-xl p-6 mt-6 shadow-custom">
            <FAQManager
              value={formData.faqs}
              onChange={(faqs) => setFormData({ ...formData, faqs })}
            />
          </div>

          {/* SERP プレビュー */}
          <div className="bg-white rounded-xl p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Google 検索結果プレビュー
              </h3>
              {/* PC / SP 切り替え */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSerpPreviewDevice('pc')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    serpPreviewDevice === 'pc'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🖥️ PC
                </button>
                <button
                  onClick={() => setSerpPreviewDevice('sp')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    serpPreviewDevice === 'sp'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📱 SP
                </button>
              </div>
            </div>
            
            <div className={`border border-gray-200 rounded-xl p-4 bg-white transition-all ${
              serpPreviewDevice === 'sp' ? 'max-w-sm mx-auto' : ''
            }`}>
              {/* タイトル */}
              <div className={`text-blue-600 hover:underline cursor-pointer mb-1 ${
                serpPreviewDevice === 'pc' ? 'text-xl' : 'text-base'
              }`}>
                {formData.metaTitle || formData.title || 'タイトルを入力してください'}
              </div>
              {/* URL */}
              <div className={serpPreviewDevice === 'pc' ? 'text-sm mb-2' : 'text-xs mb-1'}>
                <span className="text-green-700">
                  {currentTenant?.slug ? `${currentTenant.slug}.pixseo.cloud` : 'example.pixseo.cloud'} › articles › {formData.slug || 'article-slug'}
                </span>
              </div>
              {/* メタディスクリプション */}
              <div className={`text-gray-600 line-clamp-2 ${
                serpPreviewDevice === 'pc' ? 'text-sm' : 'text-xs'
              }`}>
                {formData.excerpt || 'メタディスクリプションを入力してください。検索結果に表示される説明文です。'}
              </div>
              {/* 文字数カウンター */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                <div>
                  タイトル: <span className={`font-medium ${(formData.metaTitle || formData.title || '').length > 60 ? 'text-red-500' : 'text-green-600'}`}>
                    {(formData.metaTitle || formData.title || '').length}
                  </span> / 60文字
                </div>
                <div>
                  説明: <span className={`font-medium ${formData.excerpt.length > 160 ? 'text-red-500' : 'text-green-600'}`}>
                    {formData.excerpt.length}
                  </span> / 160文字
                </div>
              </div>
            </div>
          </div>

          {/* トグルエリア（固定位置・横幅をボタンに合わせる・距離を半分に） */}
          <div className="fixed bottom-36 right-8 w-32 space-y-4 z-50">
            {/* おすすめトグル */}
            <div className="bg-white rounded-full px-6 py-3 shadow-custom">
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
            <div className="bg-white rounded-full px-6 py-3 shadow-custom">
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
        )}
      </AdminLayout>
    </AuthGuard>
  );
}

export default function NewArticlePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NewArticlePageContent />
    </Suspense>
  );
}
