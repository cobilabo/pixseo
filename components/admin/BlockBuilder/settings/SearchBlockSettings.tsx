'use client';

import { useState } from 'react';
import { Block, SearchBlockConfig } from '@/types/block';
import { SearchTypeKey } from '@/types/theme';
import CustomCheckbox from '@/components/admin/CustomCheckbox';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SearchBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

const SEARCH_TYPE_CONFIG: Record<SearchTypeKey, { label: string; icon: string; description: string }> = {
  keywordSearch: { label: 'キーワード検索', icon: '🔍', description: '記事タイトル・内容を検索' },
  tagSearch: { label: 'タグ検索（プルダウン）', icon: '🏷️', description: 'タグから関連記事を表示' },
  categorySearch: { label: 'カテゴリー検索', icon: '📂', description: 'カテゴリーから記事を絞り込み' },
  featuredTags: { label: 'おすすめタグ', icon: '⭐', description: 'テーマ設定で選択したタグを表示' },
  popularTags: { label: 'よく検索されているタグ', icon: '🔥', description: '直近1ヶ月でよく検索されたタグを表示' },
  popularKeywords: { label: 'よく検索されているキーワード', icon: '🔥', description: '管理者が承認したキーワードのみを表示' },
};

const DEFAULT_ORDER: SearchTypeKey[] = ['keywordSearch', 'tagSearch', 'categorySearch', 'featuredTags', 'popularTags', 'popularKeywords'];

function SortableSearchItem({
  id,
  label,
  icon,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  icon: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 p-3 bg-gray-50 rounded-lg transition-colors ${isDragging ? 'shadow-lg ring-2 ring-blue-300' : ''}`}
    >
      <button
        type="button"
        className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <label className="flex items-start gap-2 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{icon}</span>
            <span className="text-sm font-medium text-gray-900">{label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </label>
    </div>
  );
}

export default function SearchBlockSettings({ block, onUpdate }: SearchBlockSettingsProps) {
  const config = block.config as SearchBlockConfig;

  const updateConfig = (updates: Partial<SearchBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  const searchOrder = (() => {
    const saved = config.searchOrder;
    if (saved && saved.length > 0) {
      const missing = DEFAULT_ORDER.filter(k => !saved.includes(k));
      return [...saved, ...missing];
    }
    return DEFAULT_ORDER;
  })();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = searchOrder.indexOf(active.id as SearchTypeKey);
      const newIndex = searchOrder.indexOf(over.id as SearchTypeKey);
      updateConfig({ searchOrder: arrayMove(searchOrder, oldIndex, newIndex) });
    }
  };

  const updateSearchType = (key: SearchTypeKey, checked: boolean) => {
    updateConfig({
      searchTypes: { ...config.searchTypes, [key]: checked },
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700">
          ページ内に検索ボックスを設置します。表示する検索機能と順番を設定してください。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">検索の種類と表示順</label>
        <p className="text-xs text-gray-500 mb-3">ドラッグで表示順を変更できます</p>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={searchOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {searchOrder.map((key) => {
                const { label, icon, description } = SEARCH_TYPE_CONFIG[key];
                return (
                  <SortableSearchItem
                    key={key}
                    id={key}
                    label={label}
                    icon={icon}
                    description={description}
                    checked={config.searchTypes?.[key] ?? false}
                    onChange={(checked) => updateSearchType(key, checked)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {config.searchTypes?.categorySearch && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <label className="block text-xs font-medium text-indigo-700 mb-2">
            カテゴリー検索の表示形式
          </label>
          <div className="flex gap-3">
            {([
              { value: 'dropdown' as const, label: 'プルダウン形式' },
              { value: 'list' as const, label: 'リスト形式' },
            ]).map(({ value, label }) => (
              <label
                key={value}
                className={`flex-1 flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors text-xs ${
                  (config.categorySearchDisplayType || 'dropdown') === value
                    ? 'border-indigo-500 bg-indigo-100'
                    : 'border-transparent bg-white hover:bg-indigo-50'
                }`}
              >
                <input
                  type="radio"
                  name="categoryDisplayType"
                  value={value}
                  checked={(config.categorySearchDisplayType || 'dropdown') === value}
                  onChange={() => updateConfig({ categorySearchDisplayType: value })}
                  className="w-3.5 h-3.5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="font-medium text-gray-900">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {config.searchTypes?.featuredTags && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            表示するタグは管理画面のテーマ → 検索タブで選択してください。
          </p>
        </div>
      )}

      {config.searchTypes?.popularTags && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <label className="block text-xs font-medium text-orange-700 mb-2">
            人気タグの表示件数
          </label>
          <select
            value={config.popularTagsDisplayCount || 10}
            onChange={(e) => updateConfig({ popularTagsDisplayCount: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-orange-300 rounded-lg text-gray-900 bg-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {[5, 10, 15, 20, 30].map(num => (
              <option key={num} value={num}>{num}件</option>
            ))}
          </select>
        </div>
      )}

      {config.searchTypes?.popularKeywords && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-rose-700 mb-2">
              よく検索されているキーワードの集計期間
            </label>
            <select
              value={config.popularKeywordsAggregationDays ?? 30}
              onChange={(e) => updateConfig({ popularKeywordsAggregationDays: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-rose-300 rounded-lg text-gray-900 bg-white text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
              <option value={7}>直近7日</option>
              <option value={30}>直近30日</option>
              <option value={90}>直近90日</option>
              <option value={0}>全期間</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-rose-700 mb-2">
              表示件数
            </label>
            <select
              value={config.popularKeywordsDisplayCount || 10}
              onChange={(e) => updateConfig({ popularKeywordsDisplayCount: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-rose-300 rounded-lg text-gray-900 bg-white text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
              {[5, 10, 15, 20, 30].map(num => (
                <option key={num} value={num}>{num}件</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-rose-600">
            管理画面のテーマ → 検索タブ で承認したキーワードのみが表示されます。
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">表示デバイス</label>
        <div className="space-y-2">
          {([
            { key: 'desktop', label: 'PCサイトで表示', icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )},
            { key: 'mobile', label: 'スマホサイトで表示', icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )},
          ] as const).map(({ key, label, icon }) => {
            const checked = key === 'desktop'
              ? block.showOnDesktop !== false
              : block.showOnMobile !== false;
            return (
              <label
                key={key}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (key === 'desktop') {
                      onUpdate({ showOnDesktop: e.target.checked });
                    } else {
                      onUpdate({ showOnMobile: e.target.checked });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-500">{icon}</span>
                <span className="text-sm font-medium text-gray-900">{label}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">両方チェックを外すとどのデバイスにも表示されません</p>
      </div>
    </div>
  );
}
