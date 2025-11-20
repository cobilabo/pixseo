'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FloatingMultiSelect from '@/components/admin/FloatingMultiSelect';
import TargetAudienceInput from '@/components/admin/TargetAudienceInput';
import ArticlePatternModal from '@/components/admin/ArticlePatternModal';
import ImagePromptPatternModal from '@/components/admin/ImagePromptPatternModal';
import { Category } from '@/types/article';
import { Writer } from '@/types/writer';
import { ArticlePattern } from '@/types/article-pattern';
import { ImagePromptPattern } from '@/types/image-prompt-pattern';
import { ScheduledGeneration } from '@/types/scheduled-generation';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiGet } from '@/lib/api-client';

interface ScheduleFormData {
  name: string;
  categoryId: string;
  patternId: string;
  writerId: string;
  imagePromptPatternId: string;
  targetAudience: string;
  daysOfWeek: string[];
  timeOfDay: string;
  timezone: string;
  isActive: boolean;
}

const defaultSchedule: ScheduleFormData = {
  name: '',
  categoryId: '',
  patternId: '',
  writerId: '',
  imagePromptPatternId: '',
  targetAudience: '',
  daysOfWeek: [],
  timeOfDay: '',
  timezone: 'Asia/Tokyo',
  isActive: false,
};

function ScheduledGenerationPageContent() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [categories, setCategories] = useState<Category[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [patterns, setPatterns] = useState<ArticlePattern[]>([]);
  const [imagePromptPatterns, setImagePromptPatterns] = useState<ImagePromptPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audienceHistory, setAudienceHistory] = useState<string[]>([]);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [isImagePromptModalOpen, setIsImagePromptModalOpen] = useState(false);
  const [activeScheduleIndex, setActiveScheduleIndex] = useState(0);
  const [scheduleIds, setScheduleIds] = useState<(string | null)[]>([null, null, null, null, null]);

  // 5つの固定枠のスケジュール
  const [schedules, setSchedules] = useState<ScheduleFormData[]>([
    { ...defaultSchedule },
    { ...defaultSchedule },
    { ...defaultSchedule },
    { ...defaultSchedule },
    { ...defaultSchedule },
  ]);
  const [generatingAudience, setGeneratingAudience] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant?.id) return;
      
      setLoading(true);
      try {
        // APIリクエストの並列実行
        const results = await Promise.allSettled([
          apiGet<Category[]>(`/api/admin/categories`),
          apiGet<Writer[]>(`/api/admin/writers`),
          fetch('/api/admin/article-patterns', {
            headers: { 'x-media-id': currentTenant.id },
          }).then(res => res.json()),
          fetch('/api/admin/image-prompt-patterns', {
            headers: { 'x-media-id': currentTenant.id },
          }).then(res => res.json()),
          fetch('/api/admin/target-audience-history', {
            headers: { 'x-media-id': currentTenant.id },
          }).then(res => res.json()),
          fetch('/api/admin/scheduled-generations', {
            headers: { 'x-media-id': currentTenant.id },
          }).then(res => res.json()),
        ]);

        // 結果の処理
        const categoriesData = results[0].status === 'fulfilled' ? results[0].value : [];
        const writersData = results[1].status === 'fulfilled' ? results[1].value : [];
        const patternsResponse = results[2].status === 'fulfilled' ? results[2].value : { patterns: [] };
        const imagePromptPatternsResponse = results[3].status === 'fulfilled' ? results[3].value : { patterns: [] };
        const audienceHistoryData = results[4].status === 'fulfilled' ? results[4].value : { history: [] };
        const schedulesResponse = results[5].status === 'fulfilled' ? results[5].value : { schedules: [] };

        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setWriters(Array.isArray(writersData) ? writersData : []);
        setPatterns(Array.isArray(patternsResponse.patterns) ? patternsResponse.patterns : []);
        setImagePromptPatterns(Array.isArray(imagePromptPatternsResponse.patterns) ? imagePromptPatternsResponse.patterns : []);
        setAudienceHistory(Array.isArray(audienceHistoryData?.history) ? audienceHistoryData.history : []);

        // 既存の設定を各スロットに読み込む
        const existingSchedules = Array.isArray(schedulesResponse?.schedules) ? schedulesResponse.schedules : [];
        const newSchedules = [...schedules];
        const newScheduleIds = [...scheduleIds];
        
        existingSchedules.slice(0, 5).forEach((schedule: any, index: number) => {
          newScheduleIds[index] = schedule.id;
          newSchedules[index] = {
            name: schedule.name || `設定 ${String(index + 1).padStart(2, '0')}`,
            categoryId: schedule.categoryId || '',
            patternId: schedule.patternId || '',
            writerId: schedule.writerId || '',
            imagePromptPatternId: schedule.imagePromptPatternId || '',
            targetAudience: schedule.targetAudience || '',
            daysOfWeek: schedule.daysOfWeek || [],
            timeOfDay: schedule.timeOfDay || '',
            timezone: schedule.timezone || 'Asia/Tokyo',
            isActive: schedule.isActive ?? false,
          };
        });
        
        setSchedules(newSchedules);
        setScheduleIds(newScheduleIds);

        // デフォルト値を設定（空のスロット用）
        for (let i = 0; i < 5; i++) {
          if (!newScheduleIds[i]) {
            newSchedules[i] = {
              ...defaultSchedule,
              name: `設定 ${String(i + 1).padStart(2, '0')}`,
            };
            
            // カテゴリーが1つしかない場合、自動的に選択
            if (Array.isArray(categoriesData) && categoriesData.length === 1) {
              newSchedules[i].categoryId = categoriesData[0].id;
            }
            // ライターが1つしかない場合、自動的に選択
            if (Array.isArray(writersData) && writersData.length === 1) {
              newSchedules[i].writerId = writersData[0].id;
            }
            // 構成パターンが1つしかない場合、自動的に選択
            if (Array.isArray(patternsResponse.patterns) && patternsResponse.patterns.length === 1) {
              newSchedules[i].patternId = patternsResponse.patterns[0].id;
            }
            // 画像プロンプトパターンが1つしかない場合、自動的に選択
            if (Array.isArray(imagePromptPatternsResponse.patterns) && imagePromptPatternsResponse.patterns.length === 1) {
              newSchedules[i].imagePromptPatternId = imagePromptPatternsResponse.patterns[0].id;
            }
          }
        }
        
        setSchedules(newSchedules);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setError('データの読み込みに失敗しました。');
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
    const currentSchedule = schedules[activeScheduleIndex];
    if (!currentSchedule.categoryId) {
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
          categoryId: currentSchedule.categoryId,
          excludeHistory: audienceHistory,
        }),
      });
      if (!response.ok) throw new Error('想定読者の生成に失敗しました');
      const data = await response.json();
      
      updateSchedule(activeScheduleIndex, 'targetAudience', data.targetAudience);

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

  const updateSchedule = (index: number, field: keyof ScheduleFormData, value: any) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      newSchedules[index] = { ...newSchedules[index], [field]: value };
      return newSchedules;
    });
  };

  const toggleScheduleActive = (index: number) => {
    updateSchedule(index, 'isActive', !schedules[index].isActive);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (!currentTenant?.id) {
      setError('メディアテナントが選択されていません。');
      setSaving(false);
      return;
    }

    try {
      // 全ての設定を保存（空でも）
      const savePromises = schedules.map(async (schedule, index) => {
        const scheduleId = scheduleIds[index];
        
        const requestData = {
          name: schedule.name,
          categoryId: schedule.categoryId,
          patternId: schedule.patternId,
          writerId: schedule.writerId,
          imagePromptPatternId: schedule.imagePromptPatternId,
          targetAudience: schedule.targetAudience,
          daysOfWeek: schedule.daysOfWeek,
          timeOfDay: schedule.timeOfDay,
          timezone: schedule.timezone,
          isActive: schedule.isActive,
        };

        if (scheduleId) {
          // 更新
          const response = await fetch(`/api/admin/scheduled-generations/${scheduleId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-media-id': currentTenant.id,
            },
            body: JSON.stringify(requestData),
          });
          if (!response.ok) {
            throw new Error(`設定 ${String(index + 1).padStart(2, '0')} の更新に失敗しました`);
          }
          return response.json();
        } else {
          // 新規作成（フィールドが入力されている場合のみ）
          if (schedule.categoryId && schedule.patternId && schedule.writerId && schedule.imagePromptPatternId) {
            const response = await fetch('/api/admin/scheduled-generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-media-id': currentTenant.id,
              },
              body: JSON.stringify(requestData),
            });
            if (!response.ok) {
              throw new Error(`設定 ${String(index + 1).padStart(2, '0')} の作成に失敗しました`);
            }
            const data = await response.json();
            return data;
          }
        }
        return null;
      });

      const results = await Promise.all(savePromises);
      
      // 新規作成されたIDを保存
      const newScheduleIds = [...scheduleIds];
      results.forEach((result, index) => {
        if (result && result.id && !newScheduleIds[index]) {
          newScheduleIds[index] = result.id;
        }
      });
      setScheduleIds(newScheduleIds);

      alert('すべての定期生成設定を保存しました！');
    } catch (err: any) {
      console.error('Error saving scheduled generations:', err);
      setError(err.message || '設定の保存中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin-panel/articles');
  };

  const dayOptions = [
    { value: '0', label: '日曜日' },
    { value: '1', label: '月曜日' },
    { value: '2', label: '火曜日' },
    { value: '3', label: '水曜日' },
    { value: '4', label: '木曜日' },
    { value: '5', label: '金曜日' },
    { value: '6', label: '土曜日' },
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: `${i.toString().padStart(2, '0')}:00`,
    label: `${i.toString().padStart(2, '0')}:00`,
  }));

  const currentSchedule = schedules[activeScheduleIndex];

  return (
    <AdminLayout>
      {loading ? null : (
        <div className="max-w-4xl pb-32 animate-fadeIn">
          {/* タブメニュー */}
          <div className="bg-white rounded-[1.75rem] overflow-hidden mb-6">
            <div className="border-b border-gray-200">
              <div className="flex">
                {schedules.map((schedule, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveScheduleIndex(index)}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-between ${
                      activeScheduleIndex === index
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={activeScheduleIndex === index ? { backgroundColor: '#f9fafb' } : {}}
                  >
                    <span>設定 {String(index + 1).padStart(2, '0')}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleScheduleActive(index);
                      }}
                      className={`ml-2 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        schedule.isActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      title={schedule.isActive ? 'アクティブ' : '非アクティブ'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          schedule.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </button>
                ))}
              </div>
            </div>

            {/* タブコンテンツ */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <FloatingInput
                label="設定名 *"
                value={currentSchedule.name}
                onChange={(value) => updateSchedule(activeScheduleIndex, 'name', value)}
                required
              />

              <FloatingSelect
                label="カテゴリー *"
                value={currentSchedule.categoryId}
                onChange={(value) => updateSchedule(activeScheduleIndex, 'categoryId', value)}
                options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                required
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <FloatingSelect
                    label="構成パターン *"
                    value={currentSchedule.patternId}
                    onChange={(value) => updateSchedule(activeScheduleIndex, 'patternId', value)}
                    options={patterns.map(p => ({ value: p.id, label: p.name }))}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsPatternModalOpen(true)}
                  className="w-12 h-12 mb-0.5 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-all shadow-md flex items-center justify-center"
                  title="構成パターン管理"
                >
                  <Image src="/prompt.svg" alt="Prompt" width={20} height={20} className="brightness-0 invert" />
                </button>
              </div>
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
                value={currentSchedule.writerId}
                onChange={(value) => updateSchedule(activeScheduleIndex, 'writerId', value)}
                options={writers.map(w => ({ value: w.id, label: w.handleName }))}
                required
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <FloatingSelect
                    label="画像プロンプトパターン *"
                    value={currentSchedule.imagePromptPatternId}
                    onChange={(value) => updateSchedule(activeScheduleIndex, 'imagePromptPatternId', value)}
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

              <div className="flex gap-2">
                <div className="flex-1">
                  <TargetAudienceInput
                    value={currentSchedule.targetAudience}
                    onChange={(value) => updateSchedule(activeScheduleIndex, 'targetAudience', value)}
                    history={audienceHistory}
                    onDeleteHistory={handleDeleteAudienceHistory}
                    label="想定読者（ペルソナ）*"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGenerateTargetAudience}
                  disabled={!currentSchedule.categoryId || generatingAudience}
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

              <FloatingMultiSelect
                label="曜日 *"
                values={currentSchedule.daysOfWeek}
                onChange={(values) => updateSchedule(activeScheduleIndex, 'daysOfWeek', values)}
                options={dayOptions}
                badgeColor="purple"
              />

              <FloatingSelect
                label="時刻 *"
                value={currentSchedule.timeOfDay}
                onChange={(value) => updateSchedule(activeScheduleIndex, 'timeOfDay', value)}
                options={hourOptions}
                required
              />
            </div>
          </div>

          {/* フローティングボタン */}
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

            {/* 保存ボタン */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="すべての設定を保存"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>

          {/* 構成パターン管理モーダル */}
          <ArticlePatternModal
            isOpen={isPatternModalOpen}
            onClose={() => setIsPatternModalOpen(false)}
            onSuccess={() => {
              setIsPatternModalOpen(false);
              // パターンを再読み込み
              if (currentTenant?.id) {
                fetch('/api/admin/article-patterns', {
                  headers: { 'x-media-id': currentTenant.id },
                })
                  .then(res => res.json())
                  .then(data => {
                    setPatterns(Array.isArray(data.patterns) ? data.patterns : []);
                  })
                  .catch(err => console.error('Failed to reload patterns:', err));
              }
            }}
          />

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

export default function ScheduledGenerationPage() {
  return (
    <AuthGuard>
      <ScheduledGenerationPageContent />
    </AuthGuard>
  );
}
