'use client';

/**
 * フォームフィールド設定パネル（右サイドバー）
 * 選択されたフィールドの設定を編集
 */

import { FormField } from '@/types/block';
import FloatingInput from '../FloatingInput';

interface FormFieldSettingsProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

export default function FormFieldSettings({ field, onUpdate, onClose }: FormFieldSettingsProps) {
  const fieldTypeLabels: Record<string, string> = {
    text: 'テキスト入力',
    textarea: 'テキストエリア',
    email: 'メール',
    tel: '電話番号',
    number: '数値',
    name: '氏名',
    address: '住所',
    select: 'プルダウン',
    cascade: '連動プルダウン',
    radio: 'ラジオボタン',
    checkbox: 'チェックボックス',
    agreement: '同意確認',
    'display-text': 'テキスト表示',
    'display-image': '画像表示',
    'display-html': 'HTML表示',
  };

  const updateConfig = (updates: any) => {
    onUpdate({ config: { ...(field as any).config, ...updates } } as any);
  };

  return (
    <div className="bg-white rounded-xl shadow-md h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900">
          {fieldTypeLabels[field.type] || 'フィールド設定'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 設定フォーム */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 共通設定: ラベル */}
        <FloatingInput
          label="ラベル *"
          value={field.label || ''}
          onChange={(value) => onUpdate({ label: value })}
          required
        />

        {/* 共通設定: 必須 */}
        {!['display-text', 'display-image', 'display-html'].includes(field.type) && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={field.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="required" className="text-sm text-gray-700">
              必須入力
            </label>
          </div>
        )}

        {/* フィールドタイプ別の設定 */}
        {(field.type === 'text' || field.type === 'email' || field.type === 'tel') && (
          <FloatingInput
            label="プレースホルダー"
            value={(field as any).config?.placeholder || ''}
            onChange={(value) => updateConfig({ placeholder: value })}
          />
        )}

        {field.type === 'textarea' && (
          <>
            <FloatingInput
              label="プレースホルダー"
              value={(field as any).config?.placeholder || ''}
              onChange={(value) => updateConfig({ placeholder: value })}
            />
            <FloatingInput
              label="行数"
              type="number"
              value={((field as any).config?.rows || 4).toString()}
              onChange={(value) => updateConfig({ rows: parseInt(value) || 4 })}
            />
          </>
        )}

        {field.type === 'number' && (
          <>
            <FloatingInput
              label="最小値"
              type="number"
              value={((field as any).config?.min || 0).toString()}
              onChange={(value) => updateConfig({ min: parseInt(value) || 0 })}
            />
            <FloatingInput
              label="最大値"
              type="number"
              value={((field as any).config?.max || 100).toString()}
              onChange={(value) => updateConfig({ max: parseInt(value) || 100 })}
            />
            <FloatingInput
              label="ステップ"
              type="number"
              value={((field as any).config?.step || 1).toString()}
              onChange={(value) => updateConfig({ step: parseInt(value) || 1 })}
            />
          </>
        )}

        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選択肢（1行に1つ）
            </label>
            <textarea
              value={((field as any).config?.options || []).join('\n')}
              onChange={(e) => updateConfig({ options: e.target.value.split('\n').filter(o => o.trim()) })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {field.type === 'agreement' && (
          <FloatingInput
            label="同意テキスト"
            value={(field as any).config?.text || ''}
            onChange={(value) => updateConfig({ text: value })}
            multiline
            rows={3}
          />
        )}

        {field.type === 'display-text' && (
          <FloatingInput
            label="表示テキスト"
            value={(field as any).config?.content || ''}
            onChange={(value) => updateConfig({ content: value })}
            multiline
            rows={5}
          />
        )}

        {field.type === 'display-html' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTML
            </label>
            <textarea
              value={(field as any).config?.html || ''}
              onChange={(e) => updateConfig({ html: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

