'use client';

/**
 * フォームフィールドパレット（左サイドバー）
 * 使用可能なフィールドのリストを表示
 */

import { FormFieldType } from '@/types/block';
import { useDraggable } from '@dnd-kit/core';
import Image from 'next/image';

interface FormFieldPaletteProps {
  onAddField: (type: FormFieldType) => void;
}

const fieldTypes = [
  {
    type: 'text' as FormFieldType,
    label: 'テキスト入力',
    icon: '/textfield.svg',
    description: '1行テキスト',
  },
  {
    type: 'textarea' as FormFieldType,
    label: 'テキストエリア',
    icon: '/textarea.svg',
    description: '複数行テキスト',
  },
  {
    type: 'email' as FormFieldType,
    label: 'メール',
    icon: '/mail.svg',
    description: 'メールアドレス',
  },
  {
    type: 'tel' as FormFieldType,
    label: '電話番号',
    icon: '/phone.svg',
    description: '電話番号入力',
  },
  {
    type: 'number' as FormFieldType,
    label: '数値',
    icon: '/number.svg',
    description: '数値入力',
  },
  {
    type: 'name' as FormFieldType,
    label: '氏名',
    icon: '/name.svg',
    description: '姓名フィールド',
  },
  {
    type: 'address' as FormFieldType,
    label: '住所',
    icon: '/address.svg',
    description: '郵便番号・住所',
  },
  {
    type: 'select' as FormFieldType,
    label: 'プルダウン',
    icon: '/pulldown.svg',
    description: '単一選択',
  },
  {
    type: 'cascade' as FormFieldType,
    label: 'カスケード',
    icon: '/cascade.svg',
    description: '連動プルダウン',
  },
  {
    type: 'radio' as FormFieldType,
    label: 'ラジオボタン',
    icon: '/radio.svg',
    description: '単一選択',
  },
  {
    type: 'checkbox' as FormFieldType,
    label: 'チェックボックス',
    icon: '/checkbox.svg',
    description: '複数選択',
  },
  {
    type: 'agreement' as FormFieldType,
    label: '同意確認',
    icon: '/document.svg',
    description: '利用規約等',
  },
  {
    type: 'display-text' as FormFieldType,
    label: 'テキスト表示',
    icon: '/textarea.svg',
    description: '説明文',
  },
];

function DraggableFieldType({ fieldType }: { fieldType: typeof fieldTypes[0] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${fieldType.type}`,
    data: { type: fieldType.type },
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
            src={fieldType.icon} 
            alt={fieldType.label} 
            width={16} 
            height={16} 
            className="opacity-60 group-hover:opacity-100"
            style={{ filter: 'grayscale(30%)' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 group-hover:text-blue-600">
            {fieldType.label}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {fieldType.description}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormFieldPalette({ onAddField }: FormFieldPaletteProps) {
  return (
    <div className="space-y-2">
      {fieldTypes.map((fieldType) => (
        <DraggableFieldType key={fieldType.type} fieldType={fieldType} />
      ))}
    </div>
  );
}

