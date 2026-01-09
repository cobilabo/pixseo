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
import TargetAudienceInput from '@/components/admin/TargetAudienceInput';
import { Category, Tag, Article } from '@/types/article';
import { Writer } from '@/types/writer';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';
import { apiGet } from '@/lib/api-client';
import { generateTableOfContents, calculateReadingTime } from '@/lib/article-utils';
import { cleanWordPressHtml } from '@/lib/cleanWordPressHtml';
import FAQManager from '@/components/admin/FAQManager';
import { FAQItem } from '@/types/article';

function NewArticlePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();

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
  const [generatingAudience, setGeneratingAudience] = useState(false);
  const [audienceHistory, setAudienceHistory] = useState<string[]>([]);
  const [slugError, setSlugError] = useState('');
  const [checkingSlug, setCheckingSlug] = useState(false);
  
  // 今日の日付をYYYY-MM-DD形式で取得
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    writerId: '',
    targetAudience: '',
    categoryIds: [] as string[],
    tagIds: [] as string[], // 新規作成時は空、編集画面で設定
    relatedArticleIds: [] as string[],
    isPublished: false,
    isScheduled: false,
    isDraft: false,
    isFeatured: false,
    metaTitle: '',
    metaDescription: '',
    googleMapsUrl: '',
    reservationUrl: '',
    faqs: [] as FAQItem[],
    publishedAt: getTodayString(), // デフォルトで今日の日付
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[NewArticlePage] Fetching categories, tags, writers, and articles...');
        
        const [categoriesData, tagsData, writersData, articlesData, audienceHistoryData] = await Promise.all([
          apiGet<Category[]>('/api/admin/categories'),
          apiGet<Tag[]>('/api/admin/tags'),
          apiGet<Writer[]>('/api/admin/writers'),
          apiGet<Article[]>('/api/admin/articles'),
          fetch('/api/admin/target-audience-history', {
            headers: {
              'x-media-id': typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') || '' : '',
            },
          }).then(res => res.json()).catch(() => ({ history: [] })),
        ]);
        
        setCategories(categoriesData);
        setTags(tagsData);
        setWriters(writersData);
        setArticles(articlesData);
        setAudienceHistory(audienceHistoryData.history || []);

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
        showError('データの読み込みに失敗しました');
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
      let generatedSlug = data.slug;
      
      // 重複チェック & 一意化
      if (currentTenant) {
        let counter = 1;
        let checkSlug = generatedSlug;
        let isDuplicate = true;
        
        while (isDuplicate && counter < 100) {
          const checkResponse = await fetch(
            `/api/admin/articles/check-slug?mediaId=${currentTenant.id}&slug=${encodeURIComponent(checkSlug)}`
          );
          const checkData = await checkResponse.json();
          
          if (!checkData.isDuplicate) {
            isDuplicate = false;
            generatedSlug = checkSlug;
          } else {
            checkSlug = `${data.slug}-${counter}`;
            counter++;
          }
        }
      }
      
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
      setSlugError('');
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
      showError('タイトル、本文、スラッグ、ライターは必須です');
      return;
    }

    if (slugError) {
      showError('スラッグが重複しています。別のスラッグを使用してください。');
      return;
    }

    if (!currentTenant) {
      showError('メディアテナントが選択されていません');
      return;
    }

    // ライター名を取得
    const selectedWriter = writers.find(w => w.id === formData.writerId);
    if (!selectedWriter) {
      showError('選択されたライターが見つかりません');
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
      
      // 公開日をDateオブジェクトに変換（空の場合はnull）
      const publishedAtDate = formData.publishedAt 
        ? new Date(formData.publishedAt + 'T00:00:00+09:00') // JST
        : null;

      // 公開日が空の場合は下書き扱い
      const isDraft = !publishedAtDate;

      // 記事を保存（完了を待つ）
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
          publishedAt: publishedAtDate ? publishedAtDate.toISOString() : null,
          isScheduled: isDraft ? false : formData.isScheduled,
          isPublished: isDraft ? false : formData.isPublished,
          isDraft: isDraft,
        }),
      });

      if (!response.ok) {
        throw new Error(`作成に失敗しました: ${response.status}`);
      }
      
      console.log('[handleSubmit] 作成成功');
      
      // 一覧ページにリダイレクト（完全リロードでデータを再取得）
      showSuccess('記事を作成しました');
      window.location.href = '/articles';
    } catch (error) {
      console.error('Error:', error);
      showError('記事の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    if (formData.title) {
      generateSlugFromTitle(formData.title);
    }
  };

  const generateTargetAudience = async () => {
    if (!formData.title) {
      showError('タイトルを先に入力してください');
      return;
    }

    setGeneratingAudience(true);
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/articles/generate-target-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify({ 
          title: formData.title,
          excludeHistory: audienceHistory, // 既存履歴を除外
        }),
      });

      if (!response.ok) {
        throw new Error('想定読者の生成に失敗しました');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, targetAudience: data.targetAudience }));

      // 履歴に追加
      if (!audienceHistory.includes(data.targetAudience)) {
        setAudienceHistory(prev => [data.targetAudience, ...prev].slice(0, 20));
        // サーバーにも保存
        fetch('/api/admin/target-audience-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-media-id': currentTenantId || '',
          },
          body: JSON.stringify({ targetAudience: data.targetAudience }),
        }).catch(err => console.error('Failed to save target audience history:', err));
      }
    } catch (error) {
      console.error('Error generating target audience:', error);
      showError('想定読者の生成に失敗しました');
    } finally {
      setGeneratingAudience(false);
    }
  };

  const handleDeleteAudienceHistory = async (audience: string) => {
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch(`/api/admin/target-audience-history?targetAudience=${encodeURIComponent(audience)}`, {
        method: 'DELETE',
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) {
        throw new Error('履歴の削除に失敗しました');
      }

      const data = await response.json();
      setAudienceHistory(data.history || []);
    } catch (error) {
      console.error('Error deleting audience history:', error);
      showError('履歴の削除に失敗しました');
    }
  };

  const generateTagsFromContent = async () => {
    if (!formData.title && !formData.content) {
      showError('タイトルまたは本文を入力してください');
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

      showSuccess(`タグを生成しました（合計: ${data.summary.total}個）`);
    } catch (error) {
      console.error('Error generating tags:', error);
      showError('タグの生成に失敗しました');
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
              {/* 公開日 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  公開日
                  {formData.isScheduled && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      予約公開
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={formData.publishedAt}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    const today = getTodayString();
                    const isFuture = selectedDate > today;
                    
                    setFormData({
                      ...formData,
                      publishedAt: selectedDate,
                      isScheduled: selectedDate ? isFuture : false,
                      // 未来の日付が選択された場合は自動的に非公開に
                      isPublished: isFuture ? false : formData.isPublished,
                      // 公開日が設定された場合は下書きを解除
                      isDraft: selectedDate ? false : formData.isDraft,
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.isScheduled && (
                  <p className="mt-2 text-sm text-yellow-600">
                    ※ 公開日が未来のため、予約公開として設定されます。公開日になると自動的に公開されます。
                  </p>
                )}
              </div>

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
                  className="w-12 h-12 mb-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="タグ自動生成"
                >
                  {generatingTags ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
                  )}
                </button>
              </div>

              {/* 想定読者（ペルソナ） - カスタムプルダウン + AI自動生成ボタン */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <TargetAudienceInput
                    value={formData.targetAudience}
                    onChange={(value) => setFormData({ ...formData, targetAudience: value })}
                    history={audienceHistory}
                    onDeleteHistory={handleDeleteAudienceHistory}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateTargetAudience}
                  disabled={generatingAudience || !formData.title}
                  className="w-12 h-12 mb-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="想定読者を自動生成"
                >
                  {generatingAudience ? (
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
                    onChange={async (value) => {
                      setFormData({ ...formData, slug: value });
                      setSlugError('');
                      
                      // 空の場合はチェックしない
                      if (!value || !currentTenant) return;
                      
                      // 重複チェック
                      setCheckingSlug(true);
                      try {
                        const response = await fetch(
                          `/api/admin/articles/check-slug?mediaId=${currentTenant.id}&slug=${encodeURIComponent(value)}`
                        );
                        const data = await response.json();
                        
                        if (data.isDuplicate) {
                          setSlugError(`このスラッグは既に使用されています（記事ID: ${data.duplicateId}）`);
                        }
                      } catch (error) {
                        console.error('[slug-check] Error:', error);
                      } finally {
                        setCheckingSlug(false);
                      }
                    }}
                    required
                  />
                  {checkingSlug && (
                    <p className="text-xs text-gray-500 mt-1">スラッグを確認中...</p>
                  )}
                  {slugError && (
                    <p className="text-xs text-red-600 mt-1">{slugError}</p>
                  )}
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
                  className="w-12 h-12 mb-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
              title={formData.title}
              content={formData.content}
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
                  {currentTenant?.slug ? `${currentTenant.slug}.pixseo-preview.cloud` : 'example.pixseo-preview.cloud'} › ja › articles › {formData.slug || 'article-slug'}
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
            <div className={`bg-white rounded-full px-6 py-3 shadow-custom ${formData.isScheduled ? 'opacity-50' : ''}`}>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">
                  {formData.isScheduled ? '予約中' : '公開'}
                </span>
                <label className={formData.isScheduled ? 'cursor-not-allowed' : 'cursor-pointer'}>
                  <div className="relative inline-block w-14 h-8">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => {
                        // 予約状態の場合は変更不可
                        if (formData.isScheduled) return;
                        
                        const newIsPublished = e.target.checked;
                        
                        // 下書き状態で公開トグルをオンにした場合
                        if (newIsPublished && formData.isDraft) {
                          setFormData({
                            ...formData,
                            isPublished: true,
                            isDraft: false,
                            publishedAt: getTodayString(), // 公開日を今日に設定
                          });
                        } else {
                          setFormData({ ...formData, isPublished: newIsPublished });
                        }
                      }}
                      disabled={formData.isScheduled}
                      className="sr-only"
                    />
                    <div 
                      className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
                        formData.isScheduled ? 'bg-yellow-500' : (formData.isPublished ? 'bg-blue-600' : 'bg-gray-400')
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

            {/* 下書きトグル */}
            <div className="bg-white rounded-full px-6 py-3 shadow-custom">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">下書き</span>
                <label className="cursor-pointer">
                  <div className="relative inline-block w-14 h-8">
                    <input
                      type="checkbox"
                      checked={formData.isDraft}
                      onChange={(e) => {
                        const newIsDraft = e.target.checked;
                        
                        if (newIsDraft) {
                          // 下書きをオンにした場合：公開日を空に、公開もオフに
                          setFormData({
                            ...formData,
                            isDraft: true,
                            publishedAt: '',
                            isPublished: false,
                            isScheduled: false,
                          });
                        } else {
                          // 下書きをオフにした場合：公開日が空なら本日を設定
                          setFormData({
                            ...formData,
                            isDraft: false,
                            publishedAt: formData.publishedAt || getTodayString(),
                          });
                        }
                      }}
                      className="sr-only"
                    />
                    <div 
                      className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
                        formData.isDraft ? 'bg-orange-500' : 'bg-gray-400'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        formData.isDraft ? 'translate-x-6' : 'translate-x-0'
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
