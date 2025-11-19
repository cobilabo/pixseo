'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingSelect from '@/components/admin/FloatingSelect';
import TargetAudienceInput from '@/components/admin/TargetAudienceInput';
import { Category } from '@/types/article';
import { Writer } from '@/types/writer';
import { ArticlePattern } from '@/types/article-pattern';
import { ImagePromptPattern } from '@/types/image-prompt-pattern';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiGet } from '@/lib/api-client';

function AdvancedArticleGeneratePageContent() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [categories, setCategories] = useState<Category[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [patterns, setPatterns] = useState<ArticlePattern[]>([]);
  const [imagePromptPatterns, setImagePromptPatterns] = useState<ImagePromptPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audienceHistory, setAudienceHistory] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    categoryId: '',
    patternId: '',
    writerId: '',
    imagePromptPatternId: '',
    targetAudience: '',
  });
  const [generatingAudience, setGeneratingAudience] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant?.id) return;
      
      setLoading(true);
      try {
        const [categoriesData, writersData, patternsData, imagePromptPatternsData, audienceHistoryData] = await Promise.all([
          apiGet<Category[]>(`/api/admin/categories`).catch(() => []),
          apiGet<Writer[]>(`/api/admin/writers`).catch(() => []),
          apiGet<ArticlePattern[]>(`/api/admin/article-patterns`).catch(() => []),
          apiGet<ImagePromptPattern[]>(`/api/admin/image-prompt-patterns`).catch(() => []),
          fetch('/api/admin/target-audience-history', {
            headers: { 'x-media-id': currentTenant.id },
          }).then(res => res.json()).catch(() => ({ history: [] })),
        ]);

        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setWriters(Array.isArray(writersData) ? writersData : []);
        setPatterns(Array.isArray(patternsData) ? patternsData : []);
        setImagePromptPatterns(Array.isArray(imagePromptPatternsData) ? imagePromptPatternsData : []);
        setAudienceHistory(Array.isArray(audienceHistoryData?.history) ? audienceHistoryData.history : []);

        // カテゴリーが1つしかない場合、自動的に選択
        if (Array.isArray(categoriesData) && categoriesData.length === 1) {
          setFormData(prev => ({ ...prev, categoryId: categoriesData[0].id }));
        }

        // ライターが1つしかない場合、自動的に選択
        if (Array.isArray(writersData) && writersData.length === 1) {
          setFormData(prev => ({ ...prev, writerId: writersData[0].id }));
        }

        // 構成パターンが1つしかない場合、自動的に選択
        if (Array.isArray(patternsData) && patternsData.length === 1) {
          setFormData(prev => ({ ...prev, patternId: patternsData[0].id }));
        }

        // 画像プロンプトパターンが1つしかない場合、自動的に選択
        if (Array.isArray(imagePromptPatternsData) && imagePromptPatternsData.length === 1) {
          setFormData(prev => ({ ...prev, imagePromptPatternId: imagePromptPatternsData[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setError('データの読み込みに失敗しました。');
        // エラーが発生しても空配列を保証
        setCategories([]);
        setWriters([]);
        setPatterns([]);
        setImagePromptPatterns([]);
        setAudienceHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentTenant?.id]);

  const handleDeleteAudienceHistory = async (audience: string) => {
    if (!currentTenant?.id) return;
    try {
      const response = await fetch(`/api/admin/target-audience-history?targetAudience=${encodeURIComponent(audience)}`, {
        method: 'DELETE',
        headers: { 'x-media-id': currentTenant.id },
      });
      if (!response.ok) throw new Error('履歴の削除に失敗しました');
      const data = await response.json();
      setAudienceHistory(data.history || []);
    } catch (error) {
      console.error('Failed to delete audience history:', error);
      setError('履歴の削除に失敗しました。');
    }
  };

  const handleGenerateTargetAudience = async () => {
    if (!formData.categoryId) {
      alert('カテゴリーを先に選択してください');
      return;
    }
    setGeneratingAudience(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/articles/generate-target-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-media-id': currentTenant?.id || '' },
        body: JSON.stringify({
          categoryId: formData.categoryId,
          excludeHistory: audienceHistory,
        }),
      });
      if (!response.ok) throw new Error('想定読者の生成に失敗しました');
      const data = await response.json();
      setFormData(prev => ({ ...prev, targetAudience: data.targetAudience }));

      if (!audienceHistory.includes(data.targetAudience)) {
        setAudienceHistory(prev => [data.targetAudience, ...prev].slice(0, 20));
        fetch('/api/admin/target-audience-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-media-id': currentTenant?.id || '' },
          body: JSON.stringify({ targetAudience: data.targetAudience }),
        }).catch(err => console.error('Failed to save target audience history:', err));
      }
    } catch (err: any) {
      console.error('Error generating target audience:', err);
      setError(err.message || '想定読者の生成中にエラーが発生しました。');
    } finally {
      setGeneratingAudience(false);
    }
  };

  const handleGenerate = async () => {
    // バリデーション
    const missingFields: string[] = [];
    if (!formData.categoryId) missingFields.push('カテゴリー');
    if (!formData.patternId) missingFields.push('構成パターン');
    if (!formData.writerId) missingFields.push('ライター');
    if (!formData.imagePromptPatternId) missingFields.push('画像プロンプトパターン');
    if (!formData.targetAudience) missingFields.push('想定読者');

    if (missingFields.length > 0) {
      setError(`以下の項目を入力してください: ${missingFields.join('、')}`);
      return;
    }

    setGenerating(true);
    setError(null);

    // 記事一覧ページに戻る
    router.push('/admin-panel/articles');
    
    // トースト通知を表示
    alert('AI記事生成を開始しました。\n\n数分後に記事一覧に自動的に追加されます。\n他の作業を続けても問題ありません。');

    try {
      // バックグラウンドで実行（await しない）
      fetch('/api/admin/articles/generate-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenant?.id || '',
        },
        body: JSON.stringify(formData),
      }).then(response => {
        if (response.ok) {
          console.log('[Advanced Generate] Article generation completed');
        } else {
          console.error('[Advanced Generate] Article generation failed');
        }
      }).catch(err => {
        console.error('[Advanced Generate] Error:', err);
      });
    } catch (err) {
      console.error('Error starting article generation:', err);
    }
  };

  const handleCancel = () => {
    router.push('/admin-panel/articles');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">AI高度記事生成</h1>
            <p className="text-sm text-gray-500 mt-1">
              12ステップの自動生成フローで記事を作成します
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">データを読み込んでいます...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI高度記事生成</h1>
          <p className="text-sm text-gray-500 mt-1">
            12ステップの自動生成フローで記事を作成します
          </p>
        </div>

        <div className="space-y-6 pb-24">
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
            label="構成パターン *"
            value={formData.patternId}
            onChange={(value) => setFormData({ ...formData, patternId: value })}
            options={patterns.map(p => ({ value: p.id, label: p.name }))}
            required
          />
          {patterns.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 -mt-2">
              <p className="text-sm text-yellow-800">
                ⚠️ 構成パターンが登録されていません。
                <br />
                「構成パターン管理」ボタンから登録してください。
              </p>
            </div>
          )}

          <FloatingSelect
            label="ライター *"
            value={formData.writerId}
            onChange={(value) => setFormData({ ...formData, writerId: value })}
            options={writers.map(w => ({ value: w.id, label: w.handleName }))}
            required
          />

          <FloatingSelect
            label="画像プロンプトパターン *"
            value={formData.imagePromptPatternId}
            onChange={(value) => setFormData({ ...formData, imagePromptPatternId: value })}
            options={imagePromptPatterns.map(p => ({ value: p.id, label: p.name }))}
            required
          />
          {imagePromptPatterns.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 -mt-2">
              <p className="text-sm text-yellow-800">
                ⚠️ 画像プロンプトパターンが登録されていません。
                <br />
                メディアライブラリの「画像プロンプトパターン管理」から登録してください。
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <TargetAudienceInput
                value={formData.targetAudience}
                onChange={(value) => setFormData({ ...formData, targetAudience: value })}
                history={audienceHistory}
                onDeleteHistory={handleDeleteAudienceHistory}
                label="想定読者（ペルソナ）*"
                required
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateTargetAudience}
              disabled={!formData.categoryId || generatingAudience}
              className="w-12 h-12 mb-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="AIで想定読者を自動生成"
            >
              {generatingAudience ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
              )}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>生成フロー:</strong><br />
              1. テーマ5つ生成 → 2. 重複チェック → 3. 記事ベース作成（3,000〜3,500文字） → 
              4. タグ自動割り当て → 5. 新規タグ翻訳・登録 → 6. アイキャッチ生成 → 7. ライター選択 → 
              8. メタデータ生成 → 9. FAQ生成 → 10. 記事内画像生成・配置 → 11. 非公開として保存
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ 注意:</strong> 生成開始後、バックグラウンドで処理されます。完了すると記事一覧に自動追加されます（約4-7分）。
            </p>
          </div>
        </div>

        {/* フローティングボタン */}
        <div className="fixed bottom-8 right-8 flex gap-4 z-50">
          <button
            onClick={handleCancel}
            className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl font-medium"
          >
            キャンセル
          </button>
          
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                生成中...
              </>
            ) : (
              <>
                <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
                生成開始
              </>
            )}
          </button>
        </div>
      </div>
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

