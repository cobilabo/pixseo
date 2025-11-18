'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import FloatingInput from './FloatingInput';
import FloatingSelect from './FloatingSelect';
import { ScheduledGeneration } from '@/types/scheduled-generation';
import { Category } from '@/types/article';
import { Writer } from '@/types/writer';
import { ArticlePattern } from '@/types/article-pattern';
import { WritingStyle } from '@/types/writing-style';
import { ImagePromptPattern } from '@/types/image-prompt-pattern';

interface ScheduledGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  writers: Writer[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function ScheduledGenerationModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  writers,
}: ScheduledGenerationModalProps) {
  const [schedules, setSchedules] = useState<ScheduledGeneration[]>([]);
  const [patterns, setPatterns] = useState<ArticlePattern[]>([]);
  const [writingStyles, setWritingStyles] = useState<WritingStyle[]>([]);
  const [imagePromptPatterns, setImagePromptPatterns] = useState<ImagePromptPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    patternId: '',
    writerId: '',
    writingStyleId: '',
    imagePromptPatternId: '',
    targetAudience: '',
    daysOfWeek: [] as number[],
    timeOfDay: '09:00',
    timezone: 'Asia/Tokyo',
    isActive: true,
  });
  const [generatingAudience, setGeneratingAudience] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
      fetchPatterns();
      fetchImagePromptPatterns();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.writerId) {
      fetchWritingStyles(formData.writerId);
    } else {
      setWritingStyles([]);
      setFormData(prev => ({ ...prev, writingStyleId: '' }));
    }
  }, [formData.writerId]);

  const fetchSchedules = async () => {
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/scheduled-generations', {
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch schedules');

      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      alert('定期実行設定の取得に失敗しました');
    }
  };

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
      setPatterns(data.patterns || []);
    } catch (error) {
      console.error('Error fetching patterns:', error);
    }
  };

  const fetchWritingStyles = async (writerId: string) => {
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch(`/api/admin/writing-styles?writerId=${writerId}`, {
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch writing styles');

      const data = await response.json();
      setWritingStyles(data.styles || []);
    } catch (error) {
      console.error('Error fetching writing styles:', error);
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
      setImagePromptPatterns(data.patterns || []);
    } catch (error) {
      console.error('Error fetching image prompt patterns:', error);
    }
  };

  const handleGenerateTargetAudience = async () => {
    if (!formData.categoryId) {
      alert('カテゴリーを先に選択してください');
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
        body: JSON.stringify({ categoryId: formData.categoryId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate target audience');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, targetAudience: data.targetAudience }));
    } catch (error) {
      console.error('Error generating target audience:', error);
      alert('想定読者の生成に失敗しました');
    } finally {
      setGeneratingAudience(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.categoryId || !formData.patternId || !formData.writerId || !formData.writingStyleId || !formData.imagePromptPatternId || !formData.targetAudience || formData.daysOfWeek.length === 0) {
      alert('すべての必須項目を入力してください');
      return;
    }

    setLoading(true);

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const url = editingId
        ? `/api/admin/scheduled-generations/${editingId}`
        : '/api/admin/scheduled-generations';

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save schedule');

      alert(editingId ? '更新しました' : '作成しました');
      setFormData({
        name: '',
        categoryId: '',
        patternId: '',
        writerId: '',
        writingStyleId: '',
        imagePromptPatternId: '',
        targetAudience: '',
        daysOfWeek: [],
        timeOfDay: '09:00',
        timezone: 'Asia/Tokyo',
        isActive: true,
      });
      setEditingId(null);
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule: ScheduledGeneration) => {
    setFormData({
      name: schedule.name,
      categoryId: schedule.categoryId,
      patternId: schedule.patternId,
      writerId: schedule.writerId,
      writingStyleId: schedule.writingStyleId,
      imagePromptPatternId: schedule.imagePromptPatternId,
      targetAudience: schedule.targetAudience || '',
      daysOfWeek: schedule.daysOfWeek,
      timeOfDay: schedule.timeOfDay,
      timezone: schedule.timezone,
      isActive: schedule.isActive,
    });
    setEditingId(schedule.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この定期実行設定を削除しますか？')) return;

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch(`/api/admin/scheduled-generations/${id}`, {
        method: 'DELETE',
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to delete schedule');

      alert('削除しました');
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('削除に失敗しました');
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">定期記事生成設定</h2>
          <p className="text-sm text-gray-500 mt-1">
            指定した曜日・時間に自動的に記事を生成
          </p>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 新規作成・編集フォーム */}
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? '設定編集' : '新規設定作成'}
            </h3>
            
            <div className="space-y-4">
              <FloatingInput
                label="設定名（例: 毎週月曜のAI記事）"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              <FloatingSelect
                label="カテゴリー"
                value={formData.categoryId}
                onChange={(value) => setFormData({ ...formData, categoryId: value })}
                options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                required
              />

              <FloatingSelect
                label="構成パターン"
                value={formData.patternId}
                onChange={(value) => setFormData({ ...formData, patternId: value })}
                options={patterns.map(p => ({ value: p.id, label: p.name }))}
                required
              />

              <FloatingSelect
                label="ライター"
                value={formData.writerId}
                onChange={(value) => setFormData({ ...formData, writerId: value })}
                options={writers.map(w => ({ value: w.id, label: w.handleName }))}
                required
              />

              {formData.writerId && (
                <FloatingSelect
                  label="ライティング特徴"
                  value={formData.writingStyleId}
                  onChange={(value) => setFormData({ ...formData, writingStyleId: value })}
                  options={writingStyles.map(s => ({ value: s.id, label: s.name }))}
                  required
                />
              )}

              <FloatingSelect
                label="画像プロンプトパターン"
                value={formData.imagePromptPatternId}
                onChange={(value) => setFormData({ ...formData, imagePromptPatternId: value })}
                options={imagePromptPatterns.map(p => ({ value: p.id, label: p.name }))}
                required
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <FloatingInput
                    label="想定読者（ペルソナ）*"
                    value={formData.targetAudience}
                    onChange={(value) => setFormData({ ...formData, targetAudience: value })}
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

              {/* 曜日選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  実行曜日（複数選択可）*
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        formData.daysOfWeek.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day.label.substring(0, 1)}
                    </button>
                  ))}
                </div>
              </div>

              <FloatingSelect
                label="実行時刻"
                value={formData.timeOfDay}
                onChange={(value) => setFormData({ ...formData, timeOfDay: value })}
                options={TIME_OPTIONS.map(time => ({ value: time, label: time }))}
                required
              />

              {/* 有効/無効 */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">
                  {formData.isActive ? '有効' : '無効'}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '処理中...' : editingId ? '更新' : '作成'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        name: '',
                        categoryId: '',
                        patternId: '',
                        writerId: '',
                        writingStyleId: '',
                        imagePromptPatternId: '',
                        targetAudience: '',
                        daysOfWeek: [],
                        timeOfDay: '09:00',
                        timezone: 'Asia/Tokyo',
                        isActive: true,
                      });
                    }}
                    className="bg-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-400 transition-colors"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* 設定一覧 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">登録済み設定</h3>
            
            {schedules.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                まだ定期実行設定が登録されていません
              </p>
            ) : (
              schedules.map((schedule) => {
                const category = categories.find(c => c.id === schedule.categoryId);
                const pattern = patterns.find(p => p.id === schedule.patternId);
                const writer = writers.find(w => w.id === schedule.writerId);
                const writingStyle = writingStyles.find(s => s.id === schedule.writingStyleId);
                const imagePromptPattern = imagePromptPatterns.find(p => p.id === schedule.imagePromptPatternId);

                return (
                  <div
                    key={schedule.id}
                    className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {schedule.name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            schedule.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {schedule.isActive ? '有効' : '無効'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>カテゴリー: {category?.name || '不明'}</p>
                          <p>構成パターン: {pattern?.name || '不明'}</p>
                          <p>ライター: {writer?.handleName || '不明'}</p>
                          <p>
                            実行: {schedule.daysOfWeek.map(d => DAYS_OF_WEEK[d].label.substring(0, 1)).join(', ')} {schedule.timeOfDay}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg hover:bg-blue-50"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-600 hover:text-red-800 px-3 py-1 rounded-lg hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-400 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

