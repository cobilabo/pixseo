'use client';

/**
 * フォームビルダーキャンバス（中央エリア）
 * フィールドをドラッグ&ドロップして並べ替え
 */

import { FormField } from '@/types/block';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';

interface FormBuilderCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onDeleteField: (id: string) => void;
}

export default function FormBuilderCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
}: FormBuilderCanvasProps) {
  const { setNodeRef: setDropRef } = useDroppable({
    id: 'canvas-drop-area',
  });

  if (fields.length === 0) {
    return (
      <div 
        ref={setDropRef}
        className="text-center min-h-[400px] flex items-center justify-center"
      >
        <div>
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            フィールドを追加してください
          </h3>
          <p className="text-sm text-gray-500">
            左側のパレットからフィールドをドラッグ&ドロップ
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
      {fields.map((field) => (
        <SortableFieldItem
          key={field.id}
          field={field}
          isSelected={field.id === selectedFieldId}
          onSelect={() => onSelectField(field.id)}
          onDelete={() => onDeleteField(field.id)}
        />
      ))}
    </div>
  );
}

interface SortableFieldItemProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableFieldItem({ field, isSelected, onSelect, onDelete }: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    over,
    active,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldTypeLabels: Record<string, { label: string; icon: string }> = {
    text: { label: 'テキスト入力', icon: '/textfield.svg' },
    textarea: { label: 'テキストエリア', icon: '/textarea.svg' },
    email: { label: 'メール', icon: '/mail.svg' },
    tel: { label: '電話番号', icon: '/phone.svg' },
    number: { label: '数値', icon: '/number.svg' },
    name: { label: '氏名', icon: '/name.svg' },
    address: { label: '住所', icon: '/address.svg' },
    select: { label: 'プルダウン', icon: '/pulldown.svg' },
    cascade: { label: 'カスケード', icon: '/cascade.svg' },
    radio: { label: 'ラジオボタン', icon: '/radio.svg' },
    checkbox: { label: 'チェックボックス', icon: '/checkbox.svg' },
    agreement: { label: '同意確認', icon: '/document.svg' },
    'display-text': { label: 'テキスト表示', icon: '/textarea.svg' },
    'display-image': { label: '画像表示', icon: '/image.svg' },
    'display-html': { label: 'HTML表示', icon: '/html.svg' },
  };

  const fieldInfo = fieldTypeLabels[field.type] || { label: field.type, icon: '/textfield.svg' };

  // ドロップインジケーター表示判定
  const isOverCurrent = over?.id === field.id && active?.id !== field.id;

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

        {/* フィールド情報 */}
        <div className="ml-8 flex items-center gap-3">
          <div className="w-4 h-4 flex-shrink-0">
            <Image 
              src={fieldInfo.icon} 
              alt={fieldInfo.label} 
              width={16} 
              height={16}
              className="opacity-60"
              style={{ filter: 'grayscale(30%)' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">{field.label}</span>
              {field.required && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  必須
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {fieldInfo.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

