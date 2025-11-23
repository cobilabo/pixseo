'use client';

/**
 * ビルダーキャンバス（中央エリア）
 * ブロックをドラッグ&ドロップして並べ替え
 */

import { Block } from '@/types/block';
import { useSortable } from '@dnd-kit/sortable';
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
  if (blocks.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-md text-center">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          ブロックを追加してください
        </h3>
        <p className="text-sm text-gray-500">
          左側のパレットからブロックを選択して追加できます
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
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
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockTypeLabels: Record<string, { label: string; icon: string }> = {
    text: { label: 'テキスト', icon: '/text.svg' },
    image: { label: '画像', icon: '/image.svg' },
    cta: { label: 'CTA', icon: '/cta.svg' },
    form: { label: 'フォーム', icon: '/form.svg' },
    html: { label: 'HTML', icon: '/html.svg' },
  };

  const blockInfo = blockTypeLabels[block.type] || { label: block.type, icon: '/text.svg' };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative
        border-2
        rounded-lg
        p-4
        cursor-pointer
        transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
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
      <div className="ml-8 mr-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 flex-shrink-0">
            <Image 
              src={blockInfo.icon} 
              alt={blockInfo.label} 
              width={20} 
              height={20}
              className="opacity-60"
              style={{ filter: 'grayscale(30%)' }}
            />
          </div>
          <span className="font-medium text-gray-900">{blockInfo.label}</span>
        </div>
        <div className="text-sm text-gray-600">
          <BlockPreview block={block} />
        </div>
      </div>

      {/* 削除ボタン */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
        title="削除"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      const textConfig = block.config as any;
      return <div className="line-clamp-2" dangerouslySetInnerHTML={{ __html: textConfig.content }} />;
    case 'image':
      const imageConfig = block.config as any;
      return <span>{imageConfig.alt || '画像（alt未設定）'}</span>;
    case 'cta':
      const ctaConfig = block.config as any;
      return <span>「{ctaConfig.text}」→ {ctaConfig.url || 'URL未設定'}</span>;
    case 'form':
      const formConfig = block.config as any;
      return <span>フォームID: {formConfig.formId || '未選択'}</span>;
    case 'html':
      return <span>カスタムHTML</span>;
    default:
      return <span>不明なブロック</span>;
  }
}

