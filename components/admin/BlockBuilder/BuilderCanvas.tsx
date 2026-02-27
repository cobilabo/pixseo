'use client';

/**
 * ビルダーキャンバス（中央エリア）
 * ブロックをドラッグ&ドロップして並べ替え
 */

import { Block } from '@/types/block';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';

interface BuilderCanvasProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
}

export default function BuilderCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
}: BuilderCanvasProps) {
  const { setNodeRef: setDropRef } = useDroppable({
    id: 'canvas-drop-area',
  });

  if (blocks.length === 0) {
    return (
      <div 
        ref={setDropRef}
        className="text-center min-h-[400px] flex items-center justify-center"
      >
        <div>
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ブロックを追加してください
          </h3>
          <p className="text-sm text-gray-500">
            左側のパレットからブロックをドラッグ&ドロップ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setDropRef}
      className="space-y-2"
    >
      {blocks.map((block) => (
        <SortableBlockItem
          key={block.id}
          block={block}
          isSelected={block.id === selectedBlockId}
          onSelect={() => onSelectBlock(block.id)}
          onDelete={() => onDeleteBlock(block.id)}
        />
      ))}
    </div>
  );
}

interface SortableBlockItemProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableBlockItem({ block, isSelected, onSelect, onDelete }: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    over,
    active,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockTypeLabels: Record<string, { label: string; icon: string }> = {
    content: { label: 'セクションブロック', icon: '/dashboard.svg' },
    form: { label: 'フォーム', icon: '/form.svg' },
    article: { label: '記事', icon: '/article.svg' },
    slider: { label: 'スライダー', icon: '/dashboard.svg' },
    html: { label: 'HTML', icon: '/html.svg' },
    spacer: { label: '空白', icon: '/spacer.svg' },
    custom: { label: (block.config as any)?.customBlockName || 'カスタムブロック', icon: '/block.svg' },
  };

  const blockInfo = blockTypeLabels[block.type] || { label: block.type, icon: '/text.svg' };

  // ドロップインジケーター表示判定
  const isOverCurrent = over?.id === block.id && active?.id !== block.id;

  return (
    <div className="relative">
      {/* ドロップインジケーター（上） */}
      {isOverCurrent && (
        <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-500 rounded-full z-10" />
      )}
      
      <div
        ref={setNodeRef}
        style={style}
        className={`
          relative
          p-3
          rounded-lg
          border
          border-gray-200
          cursor-pointer
          transition-all
          ${isSelected 
            ? 'bg-blue-50 border-blue-500' 
            : 'hover:bg-gray-50 hover:border-gray-300'
          }
        `}
        onClick={onSelect}
      >
        {/* ドラッグハンドル */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zM13 3h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
          </svg>
        </div>

        {/* ブロック情報 */}
        <div className="ml-8 flex items-center gap-3">
          <div className="w-4 h-4 flex-shrink-0">
            <Image 
              src={blockInfo.icon} 
              alt={blockInfo.label} 
              width={16} 
              height={16}
              className="opacity-60"
              style={{ filter: 'grayscale(30%)' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 mb-1">{blockInfo.label}</div>
            <div className="text-sm text-gray-600">
              <BlockPreview block={block} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case 'content':
      const contentConfig = block.config as any;
      const elements = [];
      if (contentConfig.showImage) elements.push('画像');
      if (contentConfig.showHeading) elements.push('見出し');
      if (contentConfig.showText) elements.push('テキスト');
      if (contentConfig.showWriters) elements.push(`ライター×${(contentConfig.writers || []).length}`);
      if (contentConfig.showButtons) elements.push(`ボタン×${(contentConfig.buttons || []).length}`);
      
      const sectionId = contentConfig.sectionId || '未設定';
      const elementsText = elements.length > 0 ? elements.join('＋') : '要素なし';
      
      return <span>{sectionId} ({elementsText})</span>;
    case 'form':
      const formConfig = block.config as any;
      return <span>フォームID: {formConfig.formId || '未選択'}</span>;
    case 'article':
      const articleConfig = block.config as any;
      if (articleConfig.articleType === 'recent') {
        return <span>新着記事一覧 ({articleConfig.displayCount || 4}件)</span>;
      } else if (articleConfig.articleType === 'popular') {
        return <span>人気記事一覧 ({articleConfig.displayCount || 4}件)</span>;
      } else {
        const displayType = articleConfig.displayStyle === 'blogcard' ? 'ブログカード' : 'テキストリンク';
        return <span>{articleConfig.articleTitle || '未選択'} ({displayType})</span>;
      }
    case 'slider':
      return <span>スライダー設定済み記事を表示</span>;
    case 'html':
      return <span>カスタムHTML</span>;
    case 'spacer':
      const spacerConfig = block.config as any;
      return <span>高さ: {spacerConfig.height || 40}px</span>;
    case 'custom':
      return <span>カスタムブロック</span>;
    default:
      return <span>不明なブロック</span>;
  }
}

