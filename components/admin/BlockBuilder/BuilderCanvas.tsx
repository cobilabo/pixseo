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
    heading: { label: '見出し', icon: '/text.svg' },
    text: { label: 'テキスト', icon: '/textfield.svg' },
    image: { label: '画像', icon: '/image.svg' },
    imageText: { label: '画像&テキスト', icon: '/imagetext.svg' },
    cta: { label: 'CTA', icon: '/cta.svg' },
    form: { label: 'フォーム', icon: '/form.svg' },
    html: { label: 'HTML', icon: '/html.svg' },
    writer: { label: 'ライター', icon: '/writer.svg' },
    spacer: { label: '空白', icon: '/spacer.svg' },
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
    case 'heading':
      const headingConfig = block.config as any;
      return <span>{headingConfig.content}</span>;
    case 'text':
      const textConfig = block.config as any;
      return <div className="line-clamp-2">{textConfig.content}</div>;
    case 'image':
      const imageConfig = block.config as any;
      return <span>{imageConfig.alt || '画像（alt未設定）'}</span>;
    case 'imageText':
      const imageTextConfig = block.config as any;
      const positionLabel = imageTextConfig.imagePosition === 'background' ? '背景' : (imageTextConfig.imagePosition === 'left' ? '画像左' : '画像右');
      return <span>{imageTextConfig.heading} - {positionLabel}</span>;
    case 'cta':
      const ctaConfig = block.config as any;
      const buttonCount = (ctaConfig.buttons || []).length;
      const buttonText = buttonCount > 0 ? ctaConfig.buttons[0].text : 'ボタン';
      return <span>{ctaConfig.heading || '見出し'} - ボタン×{buttonCount} - {ctaConfig.buttonLayout || 'horizontal'}</span>;
    case 'form':
      const formConfig = block.config as any;
      return <span>フォームID: {formConfig.formId || '未選択'}</span>;
    case 'html':
      return <span>カスタムHTML</span>;
    case 'writer':
      const writerConfig = block.config as any;
      const writerCount = (writerConfig.writers || []).length;
      const layoutLabel = writerConfig.layout === 'vertical' ? '縦並び' : '横並び';
      return <span>ライター×{writerCount} - {layoutLabel}</span>;
    case 'spacer':
      const spacerConfig = block.config as any;
      return <span>高さ: {spacerConfig.height || 40}px</span>;
    default:
      return <span>不明なブロック</span>;
  }
}

