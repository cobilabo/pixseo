'use client';

/**
 * フォームビルダーメインコンポーネント
 * ドラッグ&ドロップでフォームフィールドを組み立てるUI
 */

import { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { FormField, FormFieldType } from '@/types/block';
import { v4 as uuidv4 } from 'uuid';
import FormFieldPalette from './FormFieldPalette';
import FormBuilderCanvas from './FormBuilderCanvas';
import FormFieldSettings from './FormFieldSettings';

interface FormBuilderProps {
  fields: any[];
  onChange: (fields: any[]) => void;
}

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  // フィールド追加
  const handleAddField = (type: FormFieldType) => {
    const newField = {
      id: uuidv4(),
      type,
      label: getDefaultLabel(type),
      required: false,
      order: fields.length,
      config: getDefaultConfig(type),
    };
    onChange([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  // フィールド削除
  const handleDeleteField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    // orderを再計算
    const reorderedFields = newFields.map((f, index) => ({ ...f, order: index }));
    onChange(reorderedFields);
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  // フィールド更新
  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    const newFields = fields.map(f => 
      f.id === id ? { ...f, ...updates } : f
    );
    onChange(newFields);
  };

  // ドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // パレットからのドラッグの場合（typeが存在）
    const type = active.data.current?.type as FormFieldType | undefined;
    if (type) {
      // 新しいフィールドを作成
      const newField = {
        id: uuidv4(),
        type,
        label: getDefaultLabel(type),
        required: false,
        order: fields.length,
        config: getDefaultConfig(type),
      };
      
      if (over && over.id !== 'canvas-drop-area') {
        // 既存フィールドの位置に挿入
        const overIndex = fields.findIndex(f => f.id === over.id);
        const newFields = [...fields];
        newFields.splice(overIndex, 0, newField);
        
        // orderを再計算
        const reorderedFields = newFields.map((f, index) => ({ ...f, order: index }));
        onChange(reorderedFields);
        setSelectedFieldId(newField.id);
      } else {
        // 最後に追加
        onChange([...fields, newField]);
        setSelectedFieldId(newField.id);
      }
      
      setActiveId(null);
      return;
    }
    
    // 既存フィールドの並び替え
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id);
      const newIndex = fields.findIndex(f => f.id === over.id);
      
      const reorderedFields = arrayMove(fields, oldIndex, newIndex).map((f, index) => ({
        ...f,
        order: index,
      }));
      
      onChange(reorderedFields);
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
            {/* 左パネル: フィールドパレット（50%） */}
            <div className="w-1/2 relative border-r border-gray-200">
              <div className="absolute inset-0 overflow-y-auto pr-6">
                <FormFieldPalette onAddField={handleAddField} />
              </div>
              
              {/* フィールド設定（左パネルに重ねる） */}
              {selectedField && (
                <div className="absolute inset-0 z-10 bg-white">
                  <FormFieldSettings
                    field={selectedField}
                    onUpdate={(updates) => handleUpdateField(selectedField.id, updates)}
                    onClose={() => setSelectedFieldId(null)}
                    onDelete={() => handleDeleteField(selectedField.id)}
                  />
                </div>
              )}
            </div>

            {/* 右パネル: キャンバス（50%） */}
            <div className="w-1/2 overflow-y-auto pl-6">
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <FormBuilderCanvas
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={setSelectedFieldId}
                  onDeleteField={handleDeleteField}
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
}

// フィールドタイプごとのデフォルトラベル
function getDefaultLabel(type: FormFieldType): string {
  const labels: Record<FormFieldType, string> = {
    text: 'テキスト入力',
    textarea: 'テキストエリア',
    email: 'メールアドレス',
    tel: '電話番号',
    number: '数値',
    name: '氏名',
    address: '住所',
    select: 'プルダウン選択',
    cascade: '連動プルダウン',
    radio: 'ラジオボタン',
    checkbox: 'チェックボックス',
    agreement: '同意確認',
    'display-text': 'テキスト表示',
    'display-image': '画像表示',
    'display-html': 'HTML表示',
  };
  return labels[type] || type;
}

// フィールドタイプごとのデフォルト設定
function getDefaultConfig(type: FormFieldType): any {
  switch (type) {
    case 'text':
    case 'email':
    case 'tel':
      return { placeholder: '' };
    case 'textarea':
      return { placeholder: '', rows: 4 };
    case 'number':
      return { min: 0, max: 100, step: 1 };
    case 'name':
      return { showLastName: true, showFirstName: true };
    case 'address':
      return {
        showPostalCode: true,
        showPrefecture: true,
        showCity: true,
        showAddress1: true,
        showAddress2: true,
      };
    case 'select':
    case 'radio':
    case 'checkbox':
      return { options: ['選択肢1', '選択肢2', '選択肢3'] };
    case 'cascade':
      return {
        options: {
          '選択肢1': ['サブ選択肢1-1', 'サブ選択肢1-2'],
          '選択肢2': ['サブ選択肢2-1', 'サブ選択肢2-2'],
        },
      };
    case 'agreement':
      return { text: '利用規約に同意する' };
    case 'display-text':
      return { content: 'テキストを入力してください' };
    case 'display-image':
      return { imageUrl: '', alt: '' };
    case 'display-html':
      return { html: '<div>HTMLを入力してください</div>' };
    default:
      return {};
  }
}

