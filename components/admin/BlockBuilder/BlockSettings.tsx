'use client';

/**
 * ブロック設定パネル（右サイドバー）
 * 選択されたブロックの設定を編集
 */

import { Block } from '@/types/block';
import TextBlockSettings from './settings/TextBlockSettings';
import ImageBlockSettings from './settings/ImageBlockSettings';
import CTABlockSettings from './settings/CTABlockSettings';
import FormBlockSettings from './settings/FormBlockSettings';
import HTMLBlockSettings from './settings/HTMLBlockSettings';

interface BlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onClose: () => void;
  onDelete: () => void;
}

export default function BlockSettings({ block, onUpdate, onClose, onDelete }: BlockSettingsProps) {
  const blockTypeLabels: Record<string, string> = {
    text: 'テキストブロック',
    image: '画像ブロック',
    cta: 'CTAブロック',
    form: 'フォームブロック',
    html: 'HTMLブロック',
  };

  return (
    <div className="bg-white rounded-xl shadow-md h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">
          {blockTypeLabels[block.type] || 'ブロック設定'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 設定フォーム */}
      <div className="flex-1 overflow-y-auto p-4">
        {block.type === 'text' && (
          <TextBlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'image' && (
          <ImageBlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'cta' && (
          <CTABlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'form' && (
          <FormBlockSettings block={block} onUpdate={onUpdate} />
        )}
        {block.type === 'html' && (
          <HTMLBlockSettings block={block} onUpdate={onUpdate} />
        )}
      </div>

      {/* 削除ボタン */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => {
            if (confirm('このブロックを削除してもよろしいですか？')) {
              onDelete();
            }
          }}
          className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          ブロックを削除
        </button>
      </div>
    </div>
  );
}

