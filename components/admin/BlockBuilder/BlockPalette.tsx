'use client';

/**
 * ブロックパレット（左サイドバー）
 * 使用可能なブロックのリストを表示
 */

import { useState, useEffect } from 'react';
import { BlockType } from '@/types/block';
import { CustomBlock } from '@/types/custom-block';
import Image from 'next/image';
import { useDraggable } from '@dnd-kit/core';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { getCustomBlocksByMediaId } from '@/lib/firebase/custom-blocks-admin';

interface BlockPaletteProps {
  onAddBlock: (type: BlockType, customBlockId?: string) => void;
}

const blockTypes = [
  {
    type: 'content' as BlockType,
    label: 'セクションブロック',
    icon: '/dashboard.svg',
    description: '画像・見出し・テキスト・ライター・ボタンを組み合わせ',
  },
  {
    type: 'form' as BlockType,
    label: 'フォームブロック',
    icon: '/form.svg',
    description: 'フォームを埋め込み',
  },
  {
    type: 'article' as BlockType,
    label: '記事ブロック',
    icon: '/article.svg',
    description: '記事リンクをテキストまたはブログカードで表示',
  },
  {
    type: 'html' as BlockType,
    label: 'HTMLブロック',
    icon: '/html.svg',
    description: 'カスタムHTMLを追加',
  },
  {
    type: 'spacer' as BlockType,
    label: '空白ブロック',
    icon: '/spacer.svg',
    description: 'ブロック間に余白を追加',
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
        {/* ドラッグハンドル */}
        <div className="flex-shrink-0">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zM13 3h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
          </svg>
        </div>
        
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
  const { currentTenant } = useMediaTenant();
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([]);

  useEffect(() => {
    if (currentTenant?.id) {
      fetchCustomBlocks();
    }
  }, [currentTenant]);

  const fetchCustomBlocks = async () => {
    if (!currentTenant?.id) return;
    try {
      const blocks = await getCustomBlocksByMediaId(currentTenant.id);
      setCustomBlocks(blocks);
    } catch (error) {
      console.error('Error fetching custom blocks:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* 標準ブロック */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          標準ブロック
        </h3>
        <div className="space-y-2">
          {blockTypes.map((blockType) => (
            <DraggableBlockType key={blockType.type} blockType={blockType} />
          ))}
        </div>
      </div>

      {/* カスタムブロック */}
      {customBlocks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            カスタムブロック
          </h3>
          <div className="space-y-2">
            {customBlocks.map((customBlock) => (
              <button
                key={customBlock.id}
                onClick={() => onAddBlock('custom', customBlock.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 flex-shrink-0">
                    <Image 
                      src="/block.svg" 
                      alt="カスタムブロック" 
                      width={16} 
                      height={16} 
                      className="opacity-60 group-hover:opacity-100"
                      style={{ filter: 'grayscale(30%)' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 group-hover:text-green-600">
                      {customBlock.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      カスタムブロック
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

