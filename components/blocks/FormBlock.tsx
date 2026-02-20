'use client';

/**
 * フォームブロック
 * 指定されたフォームIDのフォームを表示
 */

import { useState, useEffect, FormEvent } from 'react';
import { Block, FormBlockConfig, FormField } from '@/types/block';
import { Form } from '@/types/form';
import { Lang } from '@/types/lang';

const UI_STRINGS: Record<string, Record<Lang, string>> = {
  submit: { ja: '送信する', en: 'Submit', zh: '提交', ko: '제출' },
  submitting: { ja: '送信中...', en: 'Submitting...', zh: '提交中...', ko: '제출 중...' },
  loading: { ja: '読み込み中...', en: 'Loading...', zh: '加载中...', ko: '로딩 중...' },
  notFound: { ja: 'フォームが見つかりません', en: 'Form not found', zh: '未找到表单', ko: '양식을 찾을 수 없습니다' },
  inactive: { ja: 'このフォームは現在ご利用いただけません', en: 'This form is currently unavailable', zh: '此表单目前不可用', ko: '이 양식은 현재 사용할 수 없습니다' },
  defaultSuccess: { ja: 'お問い合わせありがとうございます。', en: 'Thank you for your inquiry.', zh: '感谢您的咨询。', ko: '문의해 주셔서 감사합니다.' },
  submitError: { ja: 'フォームの送信に失敗しました', en: 'Failed to submit the form', zh: '提交表单失败', ko: '양식 제출에 실패했습니다' },
  selectDefault: { ja: '選択してください', en: 'Please select', zh: '请选择', ko: '선택해 주세요' },
};

function ui(key: string, lang: Lang): string {
  return UI_STRINGS[key]?.[lang] || UI_STRINGS[key]?.ja || '';
}

function getLangField(obj: any, field: string, lang: Lang): string {
  if (lang !== 'ja' && obj?.[`${field}_${lang}`]) return obj[`${field}_${lang}`];
  return obj?.[field] || '';
}

function getLangArrayField(obj: any, field: string, lang: Lang): string[] {
  if (lang !== 'ja' && obj?.[`${field}_${lang}`]?.length) return obj[`${field}_${lang}`];
  return obj?.[field] || [];
}

interface FormBlockProps {
  block: Block;
  lang?: Lang;
}

export default function FormBlock({ block, lang = 'ja' }: FormBlockProps) {
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
      setError(err.message || ui('submitError', lang));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="my-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 text-center">{ui('loading', lang)}</p>
      </div>
    );
  }

  if (!config.formId || !form) {
    return (
      <div className="my-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          {ui('notFound', lang)}
        </p>
      </div>
    );
  }

  if (!form.isActive) {
    return (
      <div className="my-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          {ui('inactive', lang)}
        </p>
      </div>
    );
  }

  if (submitted) {
    const message = getLangField(form.afterSubmit, 'message', lang) || ui('defaultSuccess', lang);
    return (
      <div className="my-6 p-6 bg-green-50 rounded-lg border border-green-200">
        <p className="text-green-800 text-center whitespace-pre-wrap">{message}</p>
      </div>
    );
  }

  return (
    <div className="my-6" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
      {config.showTitle !== false && (
        <h3 className="text-xl font-bold text-gray-900 mb-4">{getLangField(form, 'name', lang)}</h3>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {form.fields.map((field) => (
          <FormFieldRenderer
            key={field.id}
            field={field}
            value={formData[field.id]}
            onChange={(value) => setFormData({ ...formData, [field.id]: value })}
            lang={lang}
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
          {submitting ? ui('submitting', lang) : ui('submit', lang)}
        </button>
      </form>
    </div>
  );
}

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  lang: Lang;
}

function FormFieldRenderer({ field, value, onChange, lang }: FormFieldRendererProps) {
  const cfg = (field as any).config || {};
  const label = getLangField(field, 'label', lang);
  const placeholder = getLangField(cfg, 'placeholder', lang);
  const options = getLangArrayField(cfg, 'options', lang);
  const origOptions = cfg.options || [];

  if (field.type === 'display-text') {
    return (
      <div className="py-2">
        <p className="text-gray-700 whitespace-pre-wrap">{getLangField(cfg, 'content', lang)}</p>
      </div>
    );
  }

  if (field.type === 'display-html') {
    return (
      <div 
        className="py-2"
        dangerouslySetInnerHTML={{ __html: getLangField(cfg, 'html', lang) }}
      />
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {field.required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      {(field.type === 'text' || field.type === 'email' || field.type === 'tel') && (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={field.required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
      )}

      {field.type === 'textarea' && (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={field.required}
          rows={cfg.rows || 4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
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
          <option value="">{ui('selectDefault', lang)}</option>
          {options.map((option: string, idx: number) => (
            <option key={idx} value={origOptions[idx] || option}>{option}</option>
          ))}
        </select>
      )}

      {field.type === 'radio' && (
        <div className="space-y-2">
          {options.map((option: string, idx: number) => (
            <label key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                value={origOptions[idx] || option}
                checked={value === (origOptions[idx] || option)}
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
          {options.map((option: string, idx: number) => {
            const origVal = origOptions[idx] || option;
            return (
              <label key={idx} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(value || []).includes(origVal)}
                  onChange={(e) => {
                    const newValue = value || [];
                    if (e.target.checked) {
                      onChange([...newValue, origVal]);
                    } else {
                      onChange(newValue.filter((v: string) => v !== origVal));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            );
          })}
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
          <span className="text-sm text-gray-700">{getLangField(cfg, 'text', lang)}</span>
        </label>
      )}
    </div>
  );
}
