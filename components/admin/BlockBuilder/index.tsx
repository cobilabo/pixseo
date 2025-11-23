'use client';

/**
 * ブロックビルダーメインコンポーネント
 * ドラッグ&ドロップでブロックを組み立てるUI
 */

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Block, BlockType } from '@/types/block';
import { v4 as uuidv4 } from 'uuid';
import BlockPalette from './BlockPalette';
import BuilderCanvas from './BuilderCanvas';
import BlockSettings from './BlockSettings';

interface BlockBuilderProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export interface BlockBuilderRef {
  getCurrentBlocks: () => Block[];
}

const BlockBuilder = forwardRef<BlockBuilderRef, BlockBuilderProps>(({ blocks, onChange }, ref) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localBlocks, setLocalBlocks] = useState<Block[]>(blocks);

  // propsのblocksが変更されたら同期（初回ロード時）
  useEffect(() => {
    setLocalBlocks(blocks);
  }, []);

  // 外部から現在のblocksを取得できるようにする
  useImperativeHandle(ref, () => ({
    getCurrentBlocks: () => localBlocks,
  }));

  const selectedBlock = localBlocks.find(b => b.id === selectedBlockId);

  // ブロック追加
  const handleAddBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: uuidv4(),
      type,
      order: localBlocks.length,
      config: getDefaultConfig(type),
    };
    const newBlocks = [...localBlocks, newBlock];
    setLocalBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
  };

  // ブロック削除
  const handleDeleteBlock = (id: string) => {
    const newBlocks = localBlocks.filter(b => b.id !== id);
    // orderを再計算
    const reorderedBlocks = newBlocks.map((b, index) => ({ ...b, order: index }));
    setLocalBlocks(reorderedBlocks);
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  // ブロック更新
  const handleUpdateBlock = (id: string, updates: Partial<Block>) => {
    const newBlocks = localBlocks.map(b => 
      b.id === id ? { ...b, ...updates } : b
    );
    setLocalBlocks(newBlocks);
  };

  // ドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    
    // パレットからのドラッグの場合、typeが含まれる
    const type = event.active.data.current?.type as BlockType | undefined;
    if (type) {
      // 新しいブロックを作成
      const newBlock: Block = {
        id: uuidv4(),
        type,
        order: localBlocks.length,
        config: getDefaultConfig(type),
      };
      // 一時的にactiveIdをnewBlock.idに設定
      setActiveId(newBlock.id);
      // ドラッグ中の仮ブロックとして追加
      event.active.data.current = { ...event.active.data.current, newBlock };
    }
  };

  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // パレットからのドラッグの場合
    const newBlock = active.data.current?.newBlock as Block | undefined;
    if (newBlock && over) {
      const overIndex = localBlocks.findIndex(b => b.id === over.id);
      if (overIndex >= 0) {
        // 既存のブロックの位置に挿入
        const newBlocks = [...localBlocks];
        newBlocks.splice(overIndex, 0, newBlock);
        setLocalBlocks(newBlocks.map((b, index) => ({ ...b, order: index })));
        setSelectedBlockId(newBlock.id);
      } else {
        // 末尾に追加
        setLocalBlocks([...localBlocks, newBlock]);
        setSelectedBlockId(newBlock.id);
      }
    } else if (over && active.id !== over.id) {
      // 既存ブロックの並び替え
      const oldIndex = localBlocks.findIndex(b => b.id === active.id);
      const newIndex = localBlocks.findIndex(b => b.id === over.id);
      
      if (oldIndex >= 0 && newIndex >= 0) {
        const reorderedBlocks = arrayMove(localBlocks, oldIndex, newIndex).map((b, index) => ({
          ...b,
          order: index,
        }));
        
        setLocalBlocks(reorderedBlocks);
      }
    }
    
    setActiveId(null);
  };

  return (
    <div className="relative flex gap-6 h-[calc(100vh-200px)]">
      {/* 左パネル: ブロックパレット（50%） */}
      <div className="w-1/2 flex-shrink-0 relative">
        <BlockPalette onAddBlock={handleAddBlock} />
        
        {/* ブロック設定（左パネルに重ねる） */}
        {selectedBlock && (
          <div className="absolute inset-0 z-10">
            <BlockSettings
              block={selectedBlock}
              onUpdate={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
              onClose={() => setSelectedBlockId(null)}
            />
          </div>
        )}
      </div>

      {/* 右パネル: キャンバス（50%） */}
      <div className="w-1/2 overflow-y-auto">
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={localBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <BuilderCanvas
              blocks={localBlocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onDeleteBlock={handleDeleteBlock}
            />
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg opacity-50">
                ドラッグ中...
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
});

BlockBuilder.displayName = 'BlockBuilder';

export default BlockBuilder;

// ブロックタイプごとのデフォルト設定
function getDefaultConfig(type: BlockType): any {
  switch (type) {
    case 'text':
      return {
        content: '<p>テキストを入力してください</p>',
        alignment: 'left',
        fontSize: 'medium',
        fontWeight: 'normal',
      };
    case 'image':
      return {
        imageUrl: '',
        alt: '',
        alignment: 'center',
        width: 100,
      };
    case 'cta':
      return {
        text: 'ボタンテキスト',
        url: '',
        style: 'primary',
        size: 'medium',
        alignment: 'center',
        openInNewTab: false,
      };
    case 'form':
      return {
        formId: '',
        showTitle: true,
      };
    case 'html':
      return {
        html: '<div>HTMLを入力してください</div>',
      };
    default:
      return {};
  }
}

