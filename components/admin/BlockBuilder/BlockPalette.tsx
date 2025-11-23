'use client';

/**
 * ブロックパレット（左サイドバー）
 * 使用可能なブロックのリストを表示
 */

import { BlockType } from '@/types/block';
import Image from 'next/image';
import { useDraggable } from '@dnd-kit/core';

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

const blockTypes = [
  {
    type: 'text' as BlockType,
    label: 'テキスト',
    icon: '/text.svg',
    description: '見出しや段落を追加',
  },
  {
    type: 'image' as BlockType,
    label: '画像',
    icon: '/image.svg',
    description: '画像を表示',
  },
  {
    type: 'cta' as BlockType,
    label: 'CTA',
    icon: '/cta.svg',
    description: 'ボタン/リンクを配置',
  },
  {
    type: 'form' as BlockType,
    label: 'フォーム',
    icon: '/form.svg',
    description: 'フォームを埋め込み',
  },
  {
    type: 'html' as BlockType,
    label: 'HTML',
    icon: '/html.svg',
    description: 'カスタムHTMLを追加',
  },
];

function DraggableBlockType({ blockType }: { blockType: typeof blockTypes[0] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${blockType.type}`,
    data: { type: blockType.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 flex-shrink-0">
          <Image 
            src={blockType.icon} 
            alt={blockType.label} 
            width={16} 
            height={16} 
            className="opacity-60 group-hover:opacity-100"
            style={{ filter: 'grayscale(30%)' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 group-hover:text-blue-600">
            {blockType.label}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {blockType.description}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-md h-full">
      <div className="space-y-2">
        {blockTypes.map((blockType) => (
          <DraggableBlockType key={blockType.type} blockType={blockType} />
        ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          💡 ブロックを右パネルにドラッグ&ドロップで追加
        </p>
      </div>
    </div>
  );
}

