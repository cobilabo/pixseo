'use client';
import { useState } from 'react';
import { FAQItem } from '@/types/article';

interface FAQManagerProps {
  value: FAQItem[];
  onChange: (faqs: FAQItem[]) => void;
}

export default function FAQManager({ value, onChange }: FAQManagerProps) {
  const [faqs, setFaqs] = useState<FAQItem[]>(value || []);

  const handleAdd = () => {
    const newFaqs = [...faqs, { question: '', answer: '' }];
    setFaqs(newFaqs);
    onChange(newFaqs);
  };

  const handleRemove = (index: number) => {
    const newFaqs = faqs.filter((_, i) => i !== index);
    setFaqs(newFaqs);
    onChange(newFaqs);
  };

  const handleChange = (index: number, field: 'question' | 'answer', value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    setFaqs(newFaqs);
    onChange(newFaqs);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFaqs = [...faqs];
    [newFaqs[index - 1], newFaqs[index]] = [newFaqs[index], newFaqs[index - 1]];
    setFaqs(newFaqs);
    onChange(newFaqs);
  };

  const handleMoveDown = (index: number) => {
    if (index === faqs.length - 1) return;
    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];
    setFaqs(newFaqs);
    onChange(newFaqs);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">FAQ（よくある質問）</h3>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          質問を追加
        </button>
      </div>

      {faqs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600">FAQが登録されていません</p>
          <p className="text-sm text-gray-500 mt-2">「質問を追加」ボタンから追加してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-custom space-y-4">
              {/* ヘッダー */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                    Q{index + 1}
                  </span>
                  <span className="font-semibold text-gray-900">質問 {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 順序変更ボタン */}
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={`p-2 rounded-lg transition-colors ${
                      index === 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="上に移動"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === faqs.length - 1}
                    className={`p-2 rounded-lg transition-colors ${
                      index === faqs.length - 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="下に移動"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* 削除ボタン */}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="削除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 質問入力 */}
              <div className="relative">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => handleChange(index, 'question', e.target.value)}
                  placeholder=" "
                  className="peer w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
                <label className="absolute left-3 -top-2.5 bg-white px-1 text-sm font-medium text-gray-700 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600 transition-all">
                  質問 *
                </label>
              </div>

              {/* 回答入力 */}
              <div className="relative">
                <textarea
                  value={faq.answer}
                  onChange={(e) => handleChange(index, 'answer', e.target.value)}
                  placeholder=" "
                  rows={4}
                  className="peer w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                />
                <label className="absolute left-3 -top-2.5 bg-white px-1 text-sm font-medium text-gray-700 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600 transition-all">
                  回答 *
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {faqs.length > 0 && (
        <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold mb-1">FAQスキーマについて</p>
            <p>FAQを登録すると、Google検索結果にリッチスニペット（Q&A形式）が表示される可能性があります。</p>
            <p className="mt-1">具体的で明確な質問と回答を記載することで、CTR（クリック率）が向上します。</p>
          </div>
        </div>
      )}
    </div>
  );
}

