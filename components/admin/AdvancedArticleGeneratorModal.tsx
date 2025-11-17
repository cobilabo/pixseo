'use client';

import { useState, useEffect } from 'react';
import FloatingSelect from './FloatingSelect';
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
  
  const [formData, setFormData] = useState({
    categoryId: '',
    patternId: '',
    writerId: '',
    imagePromptPatternId: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchPatterns();
      fetchImagePromptPatterns();
      
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

  const handleGenerate = async () => {
    // デバッグ用：選択されている値を出力
    console.log('[Advanced Generate] Form data:', formData);

    // より詳細なバリデーション
    const missingFields: string[] = [];
    if (!formData.categoryId) missingFields.push('カテゴリー');
    if (!formData.patternId) missingFields.push('構成パターン');
    if (!formData.writerId) missingFields.push('ライター');
    if (!formData.imagePromptPatternId) missingFields.push('画像プロンプトパターン');

    if (missingFields.length > 0) {
      setError(`以下の項目を選択してください: ${missingFields.join('、')}`);
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/articles/generate-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '記事の生成に失敗しました');
      }

      const data = await response.json();
      
      alert(`記事を生成しました！\n\nタイトル: ${data.title}\n\n記事は非公開として保存されました。`);
      onSuccess(data.articleId);
      onClose();
    } catch (err) {
      console.error('Error generating article:', err);
      setError(err instanceof Error ? err.message : '記事の生成に失敗しました');
    } finally {
      setGenerating(false);
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
          {!generating ? (
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>生成フロー:</strong><br />
                  1. テーマ5つ生成 → 2. 重複チェック → 3. 記事ベース作成（5,000文字以上） → 
                  4. タグ自動割り当て → 5. 新規タグ翻訳・登録 → 6. アイキャッチ生成 → 7. ライター選択 → 
                  8. メタデータ生成 → 9. FAQ生成 → 10. 記事内画像生成・配置 → 11. 非公開として保存
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ 注意:</strong> この処理には3〜5分程度かかります。完了まで画面を閉じないでください。
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-lg font-semibold text-gray-900 mb-2">生成中...</p>
              <p className="text-sm text-gray-500 text-center">
                記事を自動生成しています。<br />
                この処理には3〜5分程度かかります。<br />
                しばらくお待ちください...
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={generating}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-400 transition-colors disabled:opacity-50"
          >
            {generating ? 'キャンセル不可' : 'キャンセル'}
          </button>
          
          {!generating && (
            <button
              onClick={handleGenerate}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              生成開始
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

