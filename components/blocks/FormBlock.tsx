'use client';

/**
 * フォームブロック
 * 指定されたフォームIDのフォームを表示
 */

import { useState, useEffect, FormEvent } from 'react';
import { Block, FormBlockConfig, FormField } from '@/types/block';
import { Form } from '@/types/form';

interface FormBlockProps {
  block: Block;
}

export default function FormBlock({ block }: FormBlockProps) {
  const config = block.config as FormBlockConfig;
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (config.formId) {
      fetchForm();
    } else {
      setLoading(false);
    }
  }, [config.formId]);

  const fetchForm = async () => {
    try {
      const response = await fetch(`/api/admin/forms/${config.formId}`);
      if (response.ok) {
        const data = await response.json();
        setForm(data);
      }
    } catch (err) {
      console.error('Error fetching form:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/${config.formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'フォームの送信に失敗しました');
      }

      setSubmitted(true);

      // リダイレクト処理
      if (result.afterSubmit?.type === 'redirect' && result.afterSubmit?.redirectUrl) {
        window.location.href = result.afterSubmit.redirectUrl;
      }
    } catch (err: any) {
      setError(err.message || 'フォームの送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="my-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 text-center">読み込み中...</p>
      </div>
    );
  }

  if (!config.formId || !form) {
    return (
      <div className="my-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          フォームが見つかりません
        </p>
      </div>
    );
  }

  if (!form.isActive) {
    return (
      <div className="my-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          このフォームは現在ご利用いただけません
        </p>
      </div>
    );
  }

  if (submitted) {
    const message = form.afterSubmit?.message || 'お問い合わせありがとうございます。';
    return (
      <div className="my-6 p-6 bg-green-50 rounded-lg border border-green-200">
        <p className="text-green-800 text-center whitespace-pre-wrap">{message}</p>
      </div>
    );
  }

  return (
    <div className="my-6">
      {config.showTitle !== false && (
        <h3 className="text-xl font-bold text-gray-900 mb-4">{form.name}</h3>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {form.fields.map((field) => (
          <FormFieldRenderer
            key={field.id}
            field={field}
            value={formData[field.id]}
            onChange={(value) => setFormData({ ...formData, [field.id]: value })}
          />
        ))}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '送信中...' : '送信する'}
        </button>
      </form>
    </div>
  );
}

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
}

function FormFieldRenderer({ field, value, onChange }: FormFieldRendererProps) {
  // 表示専用フィールド
  if (field.type === 'display-text') {
    return (
      <div className="py-2">
        <p className="text-gray-700 whitespace-pre-wrap">{(field as any).config?.content}</p>
      </div>
    );
  }

  if (field.type === 'display-html') {
    return (
      <div 
        className="py-2"
        dangerouslySetInnerHTML={{ __html: (field as any).config?.html || '' }}
      />
    );
  }

  // 入力フィールド
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>

      {(field.type === 'text' || field.type === 'email' || field.type === 'tel') && (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={(field as any).config?.placeholder}
          required={field.required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
      )}

      {field.type === 'textarea' && (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={(field as any).config?.placeholder}
          required={field.required}
          rows={(field as any).config?.rows || 4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          min={(field as any).config?.min}
          max={(field as any).config?.max}
          step={(field as any).config?.step}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
      )}

      {field.type === 'select' && (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        >
          <option value="">選択してください</option>
          {((field as any).config?.options || []).map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}

      {field.type === 'radio' && (
        <div className="space-y-2">
          {((field as any).config?.options || []).map((option: string) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="radio"
                value={option}
                checked={value === option}
                onChange={(e) => onChange(e.target.value)}
                required={field.required}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === 'checkbox' && (
        <div className="space-y-2">
          {((field as any).config?.options || []).map((option: string) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(value || []).includes(option)}
                onChange={(e) => {
                  const newValue = value || [];
                  if (e.target.checked) {
                    onChange([...newValue, option]);
                  } else {
                    onChange(newValue.filter((v: string) => v !== option));
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === 'agreement' && (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            required={field.required}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{(field as any).config?.text}</span>
        </label>
      )}
    </div>
  );
}
