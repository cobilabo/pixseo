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
    
    console.log('[DragStart]', { id, data: event.active.data.current });
  };

  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('[DragEnd]', { 
      activeId: active.id, 
      overId: over?.id,
      activeData: active.data.current,
    });
    
    // パレットからのドラッグの場合（typeが存在）
    const type = active.data.current?.type as BlockType | undefined;
    if (type) {
      console.log('[DragEnd] Creating new block of type:', type);
      
      // 新しいブロックを作成
      const newBlock: Block = {
        id: uuidv4(),
        type,
        order: localBlocks.length,
        config: getDefaultConfig(type),
      };
      
      if (over) {
        // ドロップ先が既存ブロックの場合、その位置に挿入
        const overIndex = localBlocks.findIndex(b => b.id === over.id);
        if (overIndex >= 0) {
          console.log('[DragEnd] Inserting at index:', overIndex);
          const newBlocks = [...localBlocks];
          newBlocks.splice(overIndex, 0, newBlock);
          setLocalBlocks(newBlocks.map((b, index) => ({ ...b, order: index })));
          setSelectedBlockId(newBlock.id);
        } else {
          // 末尾に追加
          console.log('[DragEnd] Adding to end');
          setLocalBlocks([...localBlocks, newBlock]);
          setSelectedBlockId(newBlock.id);
        }
      } else {
        // over がない場合も末尾に追加
        console.log('[DragEnd] No over target, adding to end');
        setLocalBlocks([...localBlocks, newBlock]);
        setSelectedBlockId(newBlock.id);
      }
    } else if (over && active.id !== over.id) {
      // 既存ブロックの並び替え
      console.log('[DragEnd] Reordering blocks');
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
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {/* 左右を1つのパネルに統合 */}
        <div className="bg-white">
          <div className="flex h-[calc(100vh-300px)]">
            {/* 左パネル: ブロックパレット（50%） */}
            <div className="w-1/2 relative border-r border-gray-200">
              <div className="absolute inset-0 overflow-y-auto pr-6">
                <BlockPalette onAddBlock={handleAddBlock} />
              </div>
              
              {/* ブロック設定（左パネルに重ねる） */}
              {selectedBlock && (
                <div className="absolute inset-0 z-10 bg-white">
                  <BlockSettings
                    block={selectedBlock}
                    onUpdate={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
                    onClose={() => setSelectedBlockId(null)}
                    onDelete={() => handleDeleteBlock(selectedBlock.id)}
                  />
                </div>
              )}
            </div>

            {/* 右パネル: キャンバス（50%） */}
            <div className="w-1/2 overflow-y-auto pl-6">
              <SortableContext items={localBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <BuilderCanvas
                  blocks={localBlocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onDeleteBlock={handleDeleteBlock}
                />
              </SortableContext>
            </div>
          </div>
        </div>
      </div>
      
      <DragOverlay>
        {activeId ? (
          <div className="bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg opacity-50">
            ドラッグ中...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

BlockBuilder.displayName = 'BlockBuilder';

export default BlockBuilder;

// ブロックタイプごとのデフォルト設定
function getDefaultConfig(type: BlockType): any {
  switch (type) {
    case 'heading':
      return {
        content: '見出しを入力してください',
        id: '',
      };
    case 'text':
      return {
        content: 'テキストを入力してください',
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
    case 'imageText':
      return {
        imageUrl: '',
        imageAlt: '',
        imagePosition: 'left',
        heading: '見出しを入力してください',
        text: 'テキストを入力してください',
      };
    case 'cta':
      return {
        imageUrl: '',
        imageAlt: '',
        imagePosition: 'background',
        heading: '見出し',
        headingFontSize: 'medium',
        headingFontWeight: 'normal',
        headingTextColor: '',
        description: 'テキストを入力してください',
        textFontSize: 'medium',
        textFontWeight: 'normal',
        textColor: '',
        buttons: [
          {
            text: 'ボタンテキスト',
            url: '',
            buttonColor: '',
            fontSize: 'medium',
            fontWeight: 'normal',
            textColor: '',
            openInNewTab: false,
          },
        ],
        buttonLayout: 'horizontal',
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

