'use client';

/**
 * AIフォーム生成モーダル
 * 自然言語からフォームを自動生成
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface AIFormGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: string;
}

export default function AIFormGeneratorModal({ isOpen, onClose, mediaId }: AIFormGeneratorModalProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      alert('フォームの説明を入力してください');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/admin/forms/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': mediaId,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('フォームの生成に失敗しました');
      }

      const data = await response.json();
      
      alert('フォームを生成しました！編集画面を開きます。');
      router.push(`/forms/${data.formId}/edit`);
      onClose();
    } catch (error) {
      console.error('Error generating form:', error);
      alert('フォームの生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">AIフォーム生成</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* コンテンツ */}
          <form onSubmit={handleGenerate} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作成したいフォームの説明を入力してください
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: お問い合わせフォームを作成してください。名前、メールアドレス、電話番号、お問い合わせ内容（テキストエリア）、プライバシーポリシーへの同意を含めてください。"
                disabled={generating}
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 必要なフィールドを具体的に指定すると、より良いフォームが生成されます
              </p>
            </div>

            {/* 例 */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">📝 プロンプト例：</p>
              <ul className="text-xs text-blue-800 space-y-2">
                <li>• 資料請求フォームを作成してください。会社名、氏名、メール、電話番号、興味のあるサービス（チェックボックス）を含めてください。</li>
                <li>• セミナー申し込みフォームを作成してください。氏名、メール、電話、参加希望日（ラジオボタン）、質問事項を含めてください。</li>
                <li>• アンケートフォームを作成してください。性別、年齢、職業（プルダウン）、満足度（5段階評価）、フィードバックを含めてください。</li>
              </ul>
            </div>

            {/* ボタン */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={generating || !prompt.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    生成中...
                  </>
                ) : (
                  <>
                    <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
                    フォームを生成
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

