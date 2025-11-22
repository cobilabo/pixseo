'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FloatingMultiSelect from '@/components/admin/FloatingMultiSelect';
import ImagePromptPatternModal from '@/components/admin/ImagePromptPatternModal';
import { Category } from '@/types/article';
import { Writer } from '@/types/writer';
import { ImagePromptPattern } from '@/types/image-prompt-pattern';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiGet } from '@/lib/api-client';

interface ScheduleFormData {
  name: string;
  categoryId: string;
  writerId: string;
  imagePromptPatternId: string;
  daysOfWeek: string[];
  timeOfDay: string;
  timezone: string;
  isActive: boolean;
}

const defaultSchedule: ScheduleFormData = {
  name: '',
  categoryId: '',
  writerId: '',
  imagePromptPatternId: '',
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
  const [imagePromptPatterns, setImagePromptPatterns] = useState<ImagePromptPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          fetch('/api/admin/scheduled-generations', {
            headers: { 'x-media-id': currentTenant.id },
          }).then(res => res.json()),
        ]);

        // 結果の処理
        const categoriesData = results[0].status === 'fulfilled' ? results[0].value : [];
        const writersData = results[1].status === 'fulfilled' ? results[1].value : [];
        const imagePromptPatternsResponse = results[2].status === 'fulfilled' ? results[2].value : { patterns: [] };
        const schedulesResponse = results[3].status === 'fulfilled' ? results[3].value : { schedules: [] };

        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setWriters(Array.isArray(writersData) ? writersData : []);
        setImagePromptPatterns(Array.isArray(imagePromptPatternsResponse.patterns) ? imagePromptPatternsResponse.patterns : []);

        // 既存の設定を各スロットに読み込む
        const existingSchedules = Array.isArray(schedulesResponse?.schedules) ? schedulesResponse.schedules : [];
        const newSchedules = [...schedules];
        const newScheduleIds = [...scheduleIds];
        
        existingSchedules.slice(0, 5).forEach((schedule: any, index: number) => {
          newScheduleIds[index] = schedule.id;
          newSchedules[index] = {
            name: schedule.name || `設定 ${String(index + 1).padStart(2, '0')}`,
            categoryId: schedule.categoryId || '',
            writerId: schedule.writerId || '',
            imagePromptPatternId: schedule.imagePromptPatternId || '',
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
        setImagePromptPatterns([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentTenant?.id]);

  const handleSave = async () => {
    const currentSchedule = schedules[activeScheduleIndex];
    
    // バリデーション
    const missingFields: string[] = [];
    if (!currentSchedule.name) missingFields.push('設定名');
    if (!currentSchedule.categoryId) missingFields.push('カテゴリー');
    if (!currentSchedule.writerId) missingFields.push('ライター');
    if (!currentSchedule.imagePromptPatternId) missingFields.push('画像プロンプトパターン');
    if (currentSchedule.daysOfWeek.length === 0) missingFields.push('曜日');
    if (!currentSchedule.timeOfDay) missingFields.push('時刻');

    if (missingFields.length > 0) {
      setError(`以下の項目を入力してください: ${missingFields.join('、')}`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const currentScheduleId = scheduleIds[activeScheduleIndex];
      const method = currentScheduleId ? 'PUT' : 'POST';
      const url = currentScheduleId 
        ? `/api/admin/scheduled-generations/${currentScheduleId}`
        : '/api/admin/scheduled-generations';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenant?.id || '',
        },
        body: JSON.stringify(currentSchedule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'スケジュールの保存に失敗しました');
      }

      const data = await response.json();
      
      // スケジュールIDを更新
      const newScheduleIds = [...scheduleIds];
      newScheduleIds[activeScheduleIndex] = data.schedule?.id || currentScheduleId;
      setScheduleIds(newScheduleIds);

      alert('スケジュールを保存しました');
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.message || 'スケジュールの保存中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/articles');
  };

  const handleScheduleChange = (field: keyof ScheduleFormData, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[activeScheduleIndex] = {
      ...newSchedules[activeScheduleIndex],
      [field]: value,
    };
    setSchedules(newSchedules);
  };

  const currentSchedule = schedules[activeScheduleIndex];

  // 曜日選択肢
  const dayOptions = [
    { value: '0', label: '日' },
    { value: '1', label: '月' },
    { value: '2', label: '火' },
    { value: '3', label: '水' },
    { value: '4', label: '木' },
    { value: '5', label: '金' },
    { value: '6', label: '土' },
  ];

  // 時刻選択肢（5分刻み）
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const hourStr = String(h).padStart(2, '0');
      const minStr = String(m).padStart(2, '0');
      timeOptions.push({ value: `${hourStr}:${minStr}`, label: `${hourStr}:${minStr}` });
    }
  }

  return (
    <AdminLayout>
      {loading ? null : (
        <div className="max-w-4xl pb-32 animate-fadeIn">
          {/* スケジュールタブ */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {schedules.map((schedule, index) => (
              <button
                key={index}
                onClick={() => setActiveScheduleIndex(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeScheduleIndex === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {schedule.name || `設定 ${String(index + 1).padStart(2, '0')}`}
                {schedule.isActive && (
                  <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                )}
              </button>
            ))}
          </div>

          {/* 白いパネルデザイン */}
          <div className="bg-white rounded-xl p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <FloatingSelect
              label="設定名 *"
              value={currentSchedule.name}
              onChange={(value) => handleScheduleChange('name', value)}
              options={[
                { value: '設定 01', label: '設定 01' },
                { value: '設定 02', label: '設定 02' },
                { value: '設定 03', label: '設定 03' },
                { value: '設定 04', label: '設定 04' },
                { value: '設定 05', label: '設定 05' },
              ]}
              required
            />

            <FloatingSelect
              label="カテゴリー *"
              value={currentSchedule.categoryId}
              onChange={(value) => handleScheduleChange('categoryId', value)}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              required
            />

            <FloatingSelect
              label="ライター *"
              value={currentSchedule.writerId}
              onChange={(value) => handleScheduleChange('writerId', value)}
              options={writers.map(w => ({ value: w.id, label: w.handleName }))}
              required
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <FloatingSelect
                  label="画像プロンプトパターン *"
                  value={currentSchedule.imagePromptPatternId}
                  onChange={(value) => handleScheduleChange('imagePromptPatternId', value)}
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

            <FloatingMultiSelect
              label="曜日 *"
              values={currentSchedule.daysOfWeek}
              onChange={(value) => handleScheduleChange('daysOfWeek', value)}
              options={dayOptions}
              required
            />

            <FloatingSelect
              label="時刻 *"
              value={currentSchedule.timeOfDay}
              onChange={(value) => handleScheduleChange('timeOfDay', value)}
              options={timeOptions}
              required
            />

            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
              <input
                type="checkbox"
                id="isActive"
                checked={currentSchedule.isActive}
                onChange={(e) => handleScheduleChange('isActive', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                この設定を有効化する
              </label>
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
              title="保存"
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
