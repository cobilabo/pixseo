'use client';

/**
 * フォームビルダーキャンバス（中央エリア）
 * フィールドをドラッグ&ドロップして並べ替え
 */

import { FormField } from '@/types/block';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  if (fields.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-md text-center">
        <div className="text-gray-400 text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          フィールドを追加してください
        </h3>
        <p className="text-sm text-gray-500">
          左側のパレットからフィールドを選択して追加できます
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
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
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldTypeLabels: Record<string, { label: string; icon: string }> = {
    text: { label: 'テキスト入力', icon: '📝' },
    textarea: { label: 'テキストエリア', icon: '📄' },
    email: { label: 'メール', icon: '📧' },
    tel: { label: '電話番号', icon: '📞' },
    number: { label: '数値', icon: '🔢' },
    name: { label: '氏名', icon: '👤' },
    address: { label: '住所', icon: '🏠' },
    select: { label: 'プルダウン', icon: '📋' },
    cascade: { label: '連動プルダウン', icon: '🔗' },
    radio: { label: 'ラジオボタン', icon: '🔘' },
    checkbox: { label: 'チェックボックス', icon: '☑️' },
    agreement: { label: '同意確認', icon: '✅' },
    'display-text': { label: 'テキスト表示', icon: '💬' },
    'display-image': { label: '画像表示', icon: '🖼️' },
    'display-html': { label: 'HTML表示', icon: '💻' },
  };

  const fieldInfo = fieldTypeLabels[field.type] || { label: field.type, icon: '❓' };

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

      {/* フィールド情報 */}
      <div className="ml-8 mr-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{fieldInfo.icon}</span>
          <span className="font-medium text-gray-900">{field.label}</span>
          {field.required && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              必須
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {fieldInfo.label}
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

