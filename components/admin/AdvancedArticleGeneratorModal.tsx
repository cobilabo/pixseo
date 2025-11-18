'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import FloatingSelect from './FloatingSelect';
import FloatingInput from './FloatingInput';
import TargetAudienceInput from './TargetAudienceInput';
import { Category } from '@/types/article';
import { Writer } from '@/types/writer';
import { ArticlePattern } from '@/types/article-pattern';
import { ImagePromptPattern } from '@/types/image-prompt-pattern';

interface AdvancedArticleGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (articleId: string) => void;
  categories: Category[];
  writers: Writer[];
}

export default function AdvancedArticleGeneratorModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  writers,
}: AdvancedArticleGeneratorModalProps) {
  const [patterns, setPatterns] = useState<ArticlePattern[]>([]);
  const [imagePromptPatterns, setImagePromptPatterns] = useState<ImagePromptPattern[]>([]);
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
    if (isOpen) {
      fetchPatterns();
      fetchImagePromptPatterns();
      fetchAudienceHistory();
      
      // カテゴリーが1つしかない場合、自動的に選択
      if (categories.length === 1) {
        setFormData(prev => ({ ...prev, categoryId: categories[0].id }));
      }
      
      // ライターが1つしかない場合、自動的に選択
      if (writers.length === 1) {
        setFormData(prev => ({ ...prev, writerId: writers[0].id }));
      }
    }
  }, [isOpen, categories, writers]);

  const fetchPatterns = async () => {
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/article-patterns', {
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch patterns');

      const data = await response.json();
      const fetchedPatterns = data.patterns || [];
      setPatterns(fetchedPatterns);

      // オプションが1つしかない場合、自動的に選択
      if (fetchedPatterns.length === 1) {
        setFormData(prev => ({ ...prev, patternId: fetchedPatterns[0].id }));
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
    }
  };

  const fetchImagePromptPatterns = async () => {
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/image-prompt-patterns', {
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch image prompt patterns');

      const data = await response.json();
      const fetchedPatterns = data.patterns || [];
      setImagePromptPatterns(fetchedPatterns);

      // オプションが1つしかない場合、自動的に選択
      if (fetchedPatterns.length === 1) {
        setFormData(prev => ({ ...prev, imagePromptPatternId: fetchedPatterns[0].id }));
      }
    } catch (error) {
      console.error('Error fetching image prompt patterns:', error);
    }
  };

  const fetchAudienceHistory = async () => {
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/target-audience-history', {
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch audience history');

      const data = await response.json();
      setAudienceHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching audience history:', error);
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
      setError('履歴の削除に失敗しました');
    }
  };

  const handleGenerateTargetAudience = async () => {
    if (!formData.categoryId) {
      setError('カテゴリーを先に選択してください');
      return;
    }

    setGeneratingAudience(true);
    setError(null);

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
          categoryId: formData.categoryId,
          excludeHistory: audienceHistory, // 既存履歴を除外
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate target audience');
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
      setError('想定読者の生成に失敗しました');
    } finally {
      setGeneratingAudience(false);
    }
  };

  const handleGenerate = async () => {
    // デバッグ用：選択されている値を出力
    console.log('[Advanced Generate] Form data:', formData);

    // より詳細なバリデーション
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

    // モーダルを即座に閉じる
    onClose();
    
    // トースト通知を表示
    alert('AI記事生成を開始しました。\n\n数分後に記事一覧に自動的に追加されます。\n他の作業を続けても問題ありません。');

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      // バックグラウンドで実行（await しない）
      fetch('/api/admin/articles/generate-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify(formData),
      }).then(response => {
        if (response.ok) {
          console.log('[Advanced Generate] Article generation completed');
          // 成功時はページをリロードして新しい記事を表示
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">AI高度記事生成</h2>
          <p className="text-sm text-gray-500 mt-1">
            12ステップの自動生成フローで記事を作成します
          </p>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
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
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-400 transition-colors"
          >
            キャンセル
          </button>
          
          <button
            onClick={handleGenerate}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            生成開始
          </button>
        </div>
      </div>
    </div>
  );
}

