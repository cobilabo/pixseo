'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingSelect from '@/components/admin/FloatingSelect';
import ImagePromptPatternModal from '@/components/admin/ImagePromptPatternModal';
import { Category } from '@/types/article';
import { Writer } from '@/types/writer';
import { ImagePromptPattern } from '@/types/image-prompt-pattern';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';
import { apiGet } from '@/lib/api-client';

function AdvancedArticleGeneratePageContent() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();  const { showSuccess, showError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [imagePromptPatterns, setImagePromptPatterns] = useState<ImagePromptPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImagePromptModalOpen, setIsImagePromptModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    categoryId: '',
    writerId: '',
    imagePromptPatternId: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant?.id) return;
      
      setLoading(true);
      try {
        // APIリクエストの並列実行
        const results = await Promise.allSettled([
          apiGet<Category[]>(`/api/admin/categories`),
          apiGet<Writer[]>(`/api/admin/writers`),
          fetch('/api/admin/image-prompt-patterns', {
            headers: { 'x-media-id': currentTenant.id },
          }).then(res => res.json()),
        ]);

        // 結果の処理
        const categoriesData = results[0].status === 'fulfilled' ? results[0].value : [];
        const writersData = results[1].status === 'fulfilled' ? results[1].value : [];
        const imagePromptPatternsResponse = results[2].status === 'fulfilled' ? results[2].value : { patterns: [] };

        console.log('[Generate Page] Image Prompt Patterns response:', imagePromptPatternsResponse);

        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setWriters(Array.isArray(writersData) ? writersData : []);
        setImagePromptPatterns(Array.isArray(imagePromptPatternsResponse.patterns) ? imagePromptPatternsResponse.patterns : []);

        // カテゴリーが1つしかない場合、自動的に選択
        if (Array.isArray(categoriesData) && categoriesData.length === 1) {
          setFormData(prev => ({ ...prev, categoryId: categoriesData[0].id }));
        }

        // ライターが1つしかない場合、自動的に選択
        if (Array.isArray(writersData) && writersData.length === 1) {
          setFormData(prev => ({ ...prev, writerId: writersData[0].id }));
        }

        // 画像プロンプトパターンが1つしかない場合、自動的に選択
        if (Array.isArray(imagePromptPatternsResponse.patterns) && imagePromptPatternsResponse.patterns.length === 1) {
          setFormData(prev => ({ ...prev, imagePromptPatternId: imagePromptPatternsResponse.patterns[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setError('データの読み込みに失敗しました。');
        // エラーが発生しても空配列を保証
        setCategories([]);
        setWriters([]);
        setImagePromptPatterns([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentTenant?.id]);

  const handleGenerate = async () => {
    // バリデーション
    const missingFields: string[] = [];
    if (!formData.categoryId) missingFields.push('カテゴリー');
    if (!formData.writerId) missingFields.push('ライター');
    if (!formData.imagePromptPatternId) missingFields.push('画像プロンプトパターン');

    if (missingFields.length > 0) {
      setError(`以下の項目を入力してください: ${missingFields.join('、')}`);
      return;
    }

    setGenerating(true);
    setError(null);

    // 記事一覧ページに戻る
    router.push('/admin/articles');
    
    // トースト通知を表示
    showSuccess('AI記事生成を開始しました。数分後に記事一覧に追加されます。');

    try {
      // バックグラウンドで実行（await しない）
      fetch('/api/admin/articles/generate-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenant?.id || '',
        },
        body: JSON.stringify(formData),
      }).then(async response => {
        if (response.ok) {
          console.log('[Advanced Generate] Article generation completed');
        } else {
          const errorData = await response.json();
          console.error('[Advanced Generate] Article generation failed:', errorData);
          showError(`記事生成エラー: ${errorData.details || errorData.error}`);
        }
      }).catch(err => {
        console.error('[Advanced Generate] Error:', err);
        showError(`記事生成エラー: ${err.message}`);
      });
    } catch (err) {
      console.error('Error starting article generation:', err);
    }
  };

  const handleCancel = () => {
    router.push('/admin/articles');
  };

  return (
    <AdminLayout>
      {loading ? null : (
        <div className="max-w-4xl pb-32 animate-fadeIn">
          {/* 白いパネルデザイン */}
          <div className="bg-white rounded-xl p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <FloatingSelect
              label="カテゴリー *"
              value={formData.categoryId}
              onChange={(value) => setFormData({ ...formData, categoryId: value })}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              required
            />

            <FloatingSelect
              label="ライター *"
              value={formData.writerId}
              onChange={(value) => setFormData({ ...formData, writerId: value })}
              options={writers.map(w => ({ value: w.id, label: w.handleName }))}
              required
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <FloatingSelect
                  label="画像プロンプトパターン *"
                  value={formData.imagePromptPatternId}
                  onChange={(value) => setFormData({ ...formData, imagePromptPatternId: value })}
                  options={imagePromptPatterns.map(p => ({ value: p.id, label: p.name }))}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setIsImagePromptModalOpen(true)}
                className="w-12 h-12 mb-0.5 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-all shadow-md flex items-center justify-center"
                title="画像プロンプトパターン管理"
              >
                <Image src="/prompt.svg" alt="Prompt" width={20} height={20} className="brightness-0 invert" />
              </button>
            </div>
            {imagePromptPatterns.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 -mt-2">
                <p className="text-sm text-yellow-800">
                  ⚠️ 画像プロンプトパターンが登録されていません。
                  <br />
                  メディアライブラリの「画像プロンプトパターン管理」から登録してください。
                </p>
              </div>
            )}
          </div>

          {/* フローティングボタン（/new/ と同じデザイン） */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            {/* キャンセルボタン */}
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center"
              title="キャンセル"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 生成開始ボタン */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="記事を生成"
            >
              {generating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>

          {/* 画像プロンプトパターン管理モーダル */}
          <ImagePromptPatternModal
            isOpen={isImagePromptModalOpen}
            onClose={() => setIsImagePromptModalOpen(false)}
            onSuccess={() => {
              setIsImagePromptModalOpen(false);
              // 画像プロンプトパターンを再読み込み
              if (currentTenant?.id) {
                fetch('/api/admin/image-prompt-patterns', {
                  headers: { 'x-media-id': currentTenant.id },
                })
                  .then(res => res.json())
                  .then(data => {
                    setImagePromptPatterns(Array.isArray(data.patterns) ? data.patterns : []);
                  })
                  .catch(err => console.error('Failed to reload image prompt patterns:', err));
              }
            }}
          />
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdvancedArticleGeneratePage() {
  return (
    <AuthGuard>
      <AdvancedArticleGeneratePageContent />
    </AuthGuard>
  );
}
