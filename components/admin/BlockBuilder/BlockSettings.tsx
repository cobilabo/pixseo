'use client';

/**
 * ブロック設定パネル（右サイドバー）
 * 選択されたブロックの設定を編集
 */

import { Block, SliderBlockConfig } from '@/types/block';
import FormBlockSettings from './settings/FormBlockSettings';
import HTMLBlockSettings from './settings/HTMLBlockSettings';
import SpacerBlockSettings from './settings/SpacerBlockSettings';
import SpacingSettings from './settings/SpacingSettings';
import ContentBlockSettings from './settings/ContentBlockSettings';
import ArticleBlockSettings from './settings/ArticleBlockSettings';
import CustomCheckbox from '@/components/admin/CustomCheckbox';

interface BlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onClose: () => void;
  onDelete: () => void;
}

export default function BlockSettings({ block, onUpdate, onClose, onDelete }: BlockSettingsProps) {
  const blockTypeLabels: Record<string, string> = {
    content: 'セクションブロック',
    form: 'フォームブロック',
    article: '記事ブロック',
    slider: 'スライダーブロック',
    html: 'HTMLブロック',
    spacer: '空白ブロック',
    custom: 'カスタムブロック',
  };

  return (
    <div className="h-full flex flex-col">
      {/* 設定フォーム */}
      <div className="flex-1 overflow-y-auto pr-6 pt-2">
        {block.type === 'form' && (
          <FormBlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'html' && (
          <HTMLBlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'spacer' && (
          <SpacerBlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'content' && (
          <ContentBlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'article' && (
          <ArticleBlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'slider' && (() => {
          const sliderConfig = block.config as SliderBlockConfig;
          return (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-gray-700">
                  記事一覧ページの「スライダー」列で 1〜10 の数字を設定した記事がスライドで表示されます。
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  数字の小さい順に表示されます。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示カラム数
                </label>
                <select
                  value={sliderConfig.columnCount ?? 3}
                  onChange={(e) => onUpdate({ config: { ...sliderConfig, columnCount: parseInt(e.target.value, 10) } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}カラム</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  1画面に表示する記事数です。記事数が少ない場合は自動調整されます。
                </p>
              </div>

              <CustomCheckbox
                label="ページトップに横幅いっぱいで表示"
                checked={sliderConfig.fullWidthTop ?? false}
                onChange={(checked) => onUpdate({ config: { ...sliderConfig, fullWidthTop: checked } })}
              />
              {sliderConfig.fullWidthTop && (
                <p className="text-xs text-gray-500 -mt-2 ml-7">
                  ヘッダー直下に、サイドバーの有無に関わらず横幅いっぱいで表示されます。
                </p>
              )}
            </div>
          );
        })()}
        
        {/* 共通の余白設定（空白ブロック以外） */}
        {block.type !== 'spacer' && (
          <SpacingSettings block={block} onUpdate={onUpdate} />
        )}
      </div>

      {/* キャンセル・削除ボタン */}
      <div className="pr-6 pt-4 border-t border-gray-200">
        <div className="flex gap-2">
          {/* キャンセルボタン */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 flex items-center justify-center py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="閉じる"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 削除ボタン */}
          <button
            type="button"
            onClick={() => {
              if (confirm('このブロックを削除してもよろしいですか？')) {
                onDelete();
              }
            }}
            className="flex-1 flex items-center justify-center py-3 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
            title="削除"
          >
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

