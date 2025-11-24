'use client';

/**
 * ブロック設定パネル（右サイドバー）
 * 選択されたブロックの設定を編集
 */

import { Block } from '@/types/block';
import FormBlockSettings from './settings/FormBlockSettings';
import HTMLBlockSettings from './settings/HTMLBlockSettings';
import SpacerBlockSettings from './settings/SpacerBlockSettings';
import SpacingSettings from './settings/SpacingSettings';
import ContentBlockSettings from './settings/ContentBlockSettings';

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
    html: 'HTMLブロック',
    spacer: '空白ブロック',
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

