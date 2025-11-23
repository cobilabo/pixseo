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
    cascade_select: '連動プルダウン',
    radio: 'ラジオボタン',
    checkbox: 'チェックボックス',
    consent: '同意確認',
    text_display: 'テキスト表示',
    image_display: '画像表示',
    html_display: 'HTML表示',
  };

  const updateConfig = (updates: any) => {
    onUpdate({ config: { ...field.config, ...updates } });
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
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          required
        />

        {/* 共通設定: 必須 */}
        {!['text_display', 'image_display', 'html_display'].includes(field.type) && (
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
            value={field.config?.placeholder || ''}
            onChange={(e) => updateConfig({ placeholder: e.target.value })}
          />
        )}

        {field.type === 'textarea' && (
          <>
            <FloatingInput
              label="プレースホルダー"
              value={field.config?.placeholder || ''}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
            />
            <FloatingInput
              label="行数"
              type="number"
              value={(field.config?.rows || 4).toString()}
              onChange={(e) => updateConfig({ rows: parseInt(e.target.value) || 4 })}
            />
          </>
        )}

        {field.type === 'number' && (
          <>
            <FloatingInput
              label="最小値"
              type="number"
              value={(field.config?.min || 0).toString()}
              onChange={(e) => updateConfig({ min: parseInt(e.target.value) || 0 })}
            />
            <FloatingInput
              label="最大値"
              type="number"
              value={(field.config?.max || 100).toString()}
              onChange={(e) => updateConfig({ max: parseInt(e.target.value) || 100 })}
            />
            <FloatingInput
              label="ステップ"
              type="number"
              value={(field.config?.step || 1).toString()}
              onChange={(e) => updateConfig({ step: parseInt(e.target.value) || 1 })}
            />
          </>
        )}

        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選択肢（1行に1つ）
            </label>
            <textarea
              value={(field.config?.options || []).join('\n')}
              onChange={(e) => updateConfig({ options: e.target.value.split('\n').filter(o => o.trim()) })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {field.type === 'consent' && (
          <FloatingInput
            label="同意テキスト"
            value={field.config?.text || ''}
            onChange={(e) => updateConfig({ text: e.target.value })}
            multiline
            rows={3}
          />
        )}

        {field.type === 'text_display' && (
          <FloatingInput
            label="表示テキスト"
            value={field.config?.content || ''}
            onChange={(e) => updateConfig({ content: e.target.value })}
            multiline
            rows={5}
          />
        )}

        {field.type === 'html_display' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTML
            </label>
            <textarea
              value={field.config?.html || ''}
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

