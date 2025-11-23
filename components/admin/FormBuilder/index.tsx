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
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  // フィールド追加
  const handleAddField = (type: FormFieldType) => {
    const newField: FormField = {
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
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* 左サイドバー: フィールドパレット */}
      <div className="w-64 flex-shrink-0">
        <FormFieldPalette onAddField={handleAddField} />
      </div>

      {/* 中央: キャンバス */}
      <div className="flex-1 overflow-y-auto">
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <FormBuilderCanvas
              fields={fields}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onDeleteField={handleDeleteField}
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

      {/* 右サイドバー: フィールド設定 */}
      {selectedField && (
        <div className="w-80 flex-shrink-0">
          <FormFieldSettings
            field={selectedField}
            onUpdate={(updates) => handleUpdateField(selectedField.id, updates)}
            onClose={() => setSelectedFieldId(null)}
          />
        </div>
      )}
    </div>
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
    cascade_select: '連動プルダウン',
    radio: 'ラジオボタン',
    checkbox: 'チェックボックス',
    consent: '同意確認',
    text_display: 'テキスト表示',
    image_display: '画像表示',
    html_display: 'HTML表示',
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
    case 'cascade_select':
      return {
        options: {
          '選択肢1': ['サブ選択肢1-1', 'サブ選択肢1-2'],
          '選択肢2': ['サブ選択肢2-1', 'サブ選択肢2-2'],
        },
      };
    case 'consent':
      return { text: '利用規約に同意する' };
    case 'text_display':
      return { content: 'テキストを入力してください' };
    case 'image_display':
      return { imageUrl: '', alt: '' };
    case 'html_display':
      return { html: '<div>HTMLを入力してください</div>' };
    default:
      return {};
  }
}

