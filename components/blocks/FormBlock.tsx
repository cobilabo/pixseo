'use client';

/**
 * フォームブロック
 * 指定されたフォームIDのフォームを表示
 */

import { useState, useEffect, FormEvent } from 'react';
import { Block, FormBlockConfig, FormField } from '@/types/block';
import { Form } from '@/types/form';
import { Lang } from '@/types/lang';
import type { RecaptchaPublicConfig } from '@/lib/recaptcha';
import { executeRecaptchaV3 } from '@/lib/recaptcha-client';

const UI_STRINGS: Record<string, Record<Lang, string>> = {
  submit: { ja: '送信する', en: 'Submit', zh: '提交', ko: '제출' },
  submitting: { ja: '送信中...', en: 'Submitting...', zh: '提交中...', ko: '제출 중...' },
  submitted: { ja: '送信完了しました', en: 'Sent successfully', zh: '发送成功', ko: '전송 완료되었습니다' },
  loading: { ja: '読み込み中...', en: 'Loading...', zh: '加载中...', ko: '로딩 중...' },
  notFound: { ja: 'フォームが見つかりません', en: 'Form not found', zh: '未找到表单', ko: '양식을 찾을 수 없습니다' },
  inactive: { ja: 'このフォームは現在ご利用いただけません', en: 'This form is currently unavailable', zh: '此表单目前不可用', ko: '이 양식은 현재 사용할 수 없습니다' },
  defaultSuccess: { ja: 'お問い合わせありがとうございます。', en: 'Thank you for your inquiry.', zh: '感谢您的咨询。', ko: '문의해 주셔서 감사합니다.' },
  submitError: { ja: 'フォームの送信に失敗しました', en: 'Failed to submit the form', zh: '提交表单失败', ko: '양식 제출에 실패했습니다' },
  selectDefault: { ja: '選択してください', en: 'Please select', zh: '请选择', ko: '선택해 주세요' },
  contactLabel: { ja: 'CONTACT', en: 'CONTACT', zh: 'CONTACT', ko: 'CONTACT' },
  contactTitle: { ja: 'お問い合わせ', en: 'Contact Us', zh: '联系我们', ko: '문의하기' },
  contactDesc: { ja: 'ご質問・ご相談は、お気軽にお問い合わせください。<br>なお、入力確認画面や自動返信メールはございません。<br>ご入力内容を確認の上、送信ボタンを押して下さい。', en: 'Please feel free to contact us with any questions or inquiries.<br>Please note that there is no confirmation screen or automatic reply email.<br>Please review your input and press the submit button.', zh: '如有任何问题或咨询，请随时与我们联系。<br>请注意，没有输入确认页面或自动回复邮件。<br>请确认您的输入内容后点击提交按钮。', ko: '질문이나 상담은 편하게 문의해 주세요.<br>입력 확인 화면이나 자동 답장 메일은 없습니다.<br>입력 내용을 확인하신 후 전송 버튼을 눌러주세요.' },
  consentToggle: { ja: '同意内容を確認する', en: 'View consent details', zh: '查看同意内容', ko: '동의 내용 확인' },
  required: { ja: '必須', en: 'Required', zh: '必填', ko: '필수' },
  recaptchaError: { ja: 'reCAPTCHA認証に失敗しました。時間をおいて再度お試しください。', en: 'reCAPTCHA verification failed. Please try again later.', zh: 'reCAPTCHA验证失败。请稍后再试。', ko: 'reCAPTCHA 인증에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
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
  layoutTheme?: string;
  recaptchaConfig?: RecaptchaPublicConfig;
}

export default function FormBlock({ block, lang = 'ja', layoutTheme, recaptchaConfig }: FormBlockProps) {
  const config = block.config as FormBlockConfig;
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const isCobi = layoutTheme === 'cobi';

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
      let recaptchaToken: string | undefined;
      if (recaptchaConfig?.enabled && recaptchaConfig.siteKey) {
        recaptchaToken = await executeRecaptchaV3(recaptchaConfig.siteKey, 'form_submit');
      }

      const response = await fetch(`/api/forms/${config.formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: formData,
          lang,
          recaptchaToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'フォームの送信に失敗しました');
      }

      setSubmitted(true);

      if (result.afterSubmit?.type === 'redirect' && result.afterSubmit?.redirectUrl) {
        window.location.href = result.afterSubmit.redirectUrl;
      }
    } catch (err: any) {
      const message = err.message || ui('submitError', lang);
      if (/recaptcha/i.test(message)) {
        setError(ui('recaptchaError', lang));
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const statusCls = isCobi ? 'form-block--cobi-status' : 'my-6 p-6 bg-gray-50 rounded-lg border border-gray-200';
  const statusTextCls = isCobi ? '' : 'text-sm text-gray-500 text-center';

  if (loading) {
    return (
      <div className={statusCls}>
        <p className={statusTextCls}>{ui('loading', lang)}</p>
      </div>
    );
  }

  if (!config.formId || !form) {
    return (
      <div className={statusCls}>
        <p className={statusTextCls}>{ui('notFound', lang)}</p>
      </div>
    );
  }

  if (!form.isActive) {
    return (
      <div className={statusCls}>
        <p className={statusTextCls}>{ui('inactive', lang)}</p>
      </div>
    );
  }

  if (submitted && !isCobi) {
    const message = getLangField(form.afterSubmit, 'message', lang) || ui('defaultSuccess', lang);
    return (
      <div className="my-6 p-6 bg-green-50 rounded-lg border border-green-200">
        <p className="text-green-800 text-center whitespace-pre-wrap">{message}</p>
      </div>
    );
  }

  /* ── cobi テーマ ── */
  if (isCobi) {
    const allRequiredFilled = form.fields
      .filter(f => f.required)
      .every(f => {
        const v = formData[f.id];
        if (f.type === 'checkbox') return v && v.length > 0;
        if (f.type === 'agreement') return v === true;
        return v && String(v).trim() !== '';
      });

    const isButtonActive = allRequiredFilled && !submitting;

    return (
      <section id="contact" className="form-block form-block--cobi">
        <div className="form-block--cobi-inner">
          {/* ヘッダー */}
          <div className="form-block--cobi-header">
            <p><span className="form-block--cobi-label">{ui('contactLabel', lang)}</span></p>
            <h3 className="form-block--cobi-title">{ui('contactTitle', lang)}</h3>
            <p className="form-block--cobi-desc" dangerouslySetInnerHTML={{ __html: ui('contactDesc', lang) }} />
          </div>

          <form onSubmit={handleSubmit} className="form-block--cobi-form">
            {form.fields.map((field) => (
              <CobiFieldRenderer
                key={field.id}
                field={field}
                value={formData[field.id]}
                onChange={(value) => setFormData({ ...formData, [field.id]: value })}
                lang={lang}
              />
            ))}

            {error && (
              <div className="p-4 bg-red-900/30 border border-red-500/40 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || submitted}
              className={`form-block--cobi-submit ${submitted ? 'form-block--cobi-submit--success' : isButtonActive ? 'form-block--cobi-submit--active' : ''}`}
            >
              {submitted ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-5 h-5 cobi-submit-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {ui('submitted', lang)}
                </span>
              ) : (
                <span>{submitting ? ui('submitting', lang) : ui('submit', lang)}</span>
              )}
            </button>
          </form>
        </div>
      </section>
    );
  }

  /* ── デフォルトテーマ ── */
  return (
    <div className="my-6 form-block" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
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

/* ────────────────────────────────────────────
   cobi テーマ用フィールドレンダラー
   フローティングラベル付きフィールド
──────────────────────────────────────────── */

interface CobiFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  lang: Lang;
}

function CobiFieldRenderer({ field, value, onChange, lang }: CobiFieldRendererProps) {
  const cfg = (field as any).config || {};
  const label = getLangField(field, 'label', lang);
  const placeholder = getLangField(cfg, 'placeholder', lang);
  const options = getLangArrayField(cfg, 'options', lang);
  const origOptions = cfg.options || [];

  if (field.type === 'display-text') {
    return (
      <div className="py-2">
        <p className="text-gray-300 whitespace-pre-wrap">{getLangField(cfg, 'content', lang)}</p>
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

  if (field.type === 'textarea') {
    return (
      <div className="cobi-field">
        <div className="cobi-field-box cobi-field-box--textarea">
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder=" "
            required={field.required}
            rows={cfg.rows || 4}
            className="cobi-field-input cobi-field-textarea"
          />
          {label && (
            <label className="cobi-field-label">
              {label}
              {field.required && <span className="cobi-required-badge">{ui('required', lang)}</span>}
            </label>
          )}
        </div>
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="cobi-field">
        <div className="cobi-field-box cobi-field-box--select">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={`cobi-field-input cobi-field-select ${!value ? 'cobi-field-select--empty' : ''}`}
          >
            <option value="">{ui('selectDefault', lang)}</option>
            {options.map((option: string, idx: number) => (
              <option key={idx} value={origOptions[idx] || option}>{option}</option>
            ))}
          </select>
          {label && (
            <label className="cobi-field-label">
              {label}
              {field.required && <span className="cobi-required-badge">{ui('required', lang)}</span>}
            </label>
          )}
        </div>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div className="cobi-field">
        <div className="cobi-field-box">
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder=" "
            required={field.required}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            className="cobi-field-input"
          />
          {label && (
            <label className="cobi-field-label">
              {label}
              {field.required && <span className="cobi-required-badge">{ui('required', lang)}</span>}
            </label>
          )}
        </div>
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className="cobi-field">
        {label && (
          <p className="text-sm text-gray-300 mb-2">
            {label}
            {field.required && <span className="cobi-required-badge">{ui('required', lang)}</span>}
          </p>
        )}
        <div className="space-y-2">
          {options.map((option: string, idx: number) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={origOptions[idx] || option}
                checked={value === (origOptions[idx] || option)}
                onChange={(e) => onChange(e.target.value)}
                required={field.required}
                className="w-4 h-4 text-white border-gray-500 focus:ring-white bg-transparent"
              />
              <span className="text-sm text-gray-200">{option}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="cobi-field">
        {label && (
          <p className="text-sm text-gray-300 mb-2">
            {label}
            {field.required && <span className="cobi-required-badge">{ui('required', lang)}</span>}
          </p>
        )}
        <div className="space-y-2">
          {options.map((option: string, idx: number) => {
            const origVal = origOptions[idx] || option;
            return (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
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
                  className="w-4 h-4 text-white border-gray-500 rounded focus:ring-white bg-transparent"
                />
                <span className="text-sm text-gray-200">{option}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'agreement') {
    const consentBody = getLangField(cfg, 'consentBody', lang);
    return (
      <div className="cobi-agreement">
        {consentBody && (
          <details className="cobi-agreement-details">
            <summary className="cobi-agreement-toggle">
              {ui('consentToggle', lang)}
              <svg className="cobi-agreement-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </summary>
            <div className="cobi-agreement-body">
              <p>{consentBody}</p>
            </div>
          </details>
        )}
        <label className="cobi-agreement-label">
          <span className="cobi-agreement-checkbox">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              required={field.required}
            />
            <span className="cobi-agreement-check-icon">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </span>
          <span className="cobi-agreement-text">{getLangField(cfg, 'text', lang)}</span>
        </label>
      </div>
    );
  }

  // text / email / tel (デフォルト)
  return (
    <div className="cobi-field">
      <div className="cobi-field-box">
        <input
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          required={field.required}
          className="cobi-field-input"
        />
        {label && (
          <label className="cobi-field-label">
            {label}
            {field.required && <span className="cobi-required-badge">{ui('required', lang)}</span>}
          </label>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   デフォルトテーマ用フィールドレンダラー
──────────────────────────────────────────── */

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
          {field.required && <span className="default-required-badge">{ui('required', lang)}</span>}
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
