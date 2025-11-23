'use client';

/**
 * フォームフィールドパレット（左サイドバー）
 * 使用可能なフィールドのリストを表示
 */

import { FormFieldType } from '@/types/block';

interface FormFieldPaletteProps {
  onAddField: (type: FormFieldType) => void;
}

const fieldTypes = [
  {
    type: 'text' as FormFieldType,
    label: 'テキスト入力',
    icon: '📝',
    description: '1行テキスト',
  },
  {
    type: 'textarea' as FormFieldType,
    label: 'テキストエリア',
    icon: '📄',
    description: '複数行テキスト',
  },
  {
    type: 'email' as FormFieldType,
    label: 'メール',
    icon: '📧',
    description: 'メールアドレス',
  },
  {
    type: 'tel' as FormFieldType,
    label: '電話番号',
    icon: '📞',
    description: '電話番号入力',
  },
  {
    type: 'number' as FormFieldType,
    label: '数値',
    icon: '🔢',
    description: '数値入力',
  },
  {
    type: 'name' as FormFieldType,
    label: '氏名',
    icon: '👤',
    description: '姓名フィールド',
  },
  {
    type: 'address' as FormFieldType,
    label: '住所',
    icon: '🏠',
    description: '郵便番号・住所',
  },
  {
    type: 'select' as FormFieldType,
    label: 'プルダウン',
    icon: '📋',
    description: '単一選択',
  },
  {
    type: 'radio' as FormFieldType,
    label: 'ラジオボタン',
    icon: '🔘',
    description: '単一選択',
  },
  {
    type: 'checkbox' as FormFieldType,
    label: 'チェックボックス',
    icon: '☑️',
    description: '複数選択',
  },
  {
    type: 'consent' as FormFieldType,
    label: '同意確認',
    icon: '✅',
    description: '利用規約等',
  },
  {
    type: 'text_display' as FormFieldType,
    label: 'テキスト表示',
    icon: '💬',
    description: '説明文',
  },
];

export default function FormFieldPalette({ onAddField }: FormFieldPaletteProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-md h-full overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-900 mb-4">フィールド</h3>
      <div className="space-y-2">
        {fieldTypes.map((fieldType) => (
          <button
            key={fieldType.type}
            onClick={() => onAddField(fieldType.type)}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{fieldType.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 group-hover:text-blue-600 text-sm">
                  {fieldType.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {fieldType.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          💡 フィールドをクリックして追加できます
        </p>
      </div>
    </div>
  );
}

