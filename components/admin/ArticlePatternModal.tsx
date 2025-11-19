'use client';

import { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import { ArticlePattern } from '@/types/article-pattern';

interface ArticlePatternModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ArticlePatternModal({
  isOpen,
  onClose,
  onSuccess,
}: ArticlePatternModalProps) {
  const [patterns, setPatterns] = useState<ArticlePattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatternId, setSelectedPatternId] = useState<string | 'new'>('new');
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchPatterns();
    }
  }, [isOpen]);

  useEffect(() => {
    // タブ選択時にフォームデータを更新
    if (selectedPatternId === 'new') {
      setFormData({ name: '', prompt: '' });
    } else {
      const pattern = patterns.find(p => p.id === selectedPatternId);
      if (pattern) {
        setFormData({
          name: pattern.name,
          prompt: pattern.prompt,
        });
      }
    }
  }, [selectedPatternId, patterns]);

  const fetchPatterns = async () => {
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/article-patterns', {
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch patterns');

      const data = await response.json();
      setPatterns(data.patterns || []);
    } catch (error) {
      console.error('Error fetching patterns:', error);
      alert('構成パターンの取得に失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.prompt) {
      alert('パターン名とプロンプトは必須です');
      return;
    }

    setLoading(true);

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const isEdit = selectedPatternId !== 'new';
      const url = isEdit
        ? `/api/admin/article-patterns/${selectedPatternId}`
        : '/api/admin/article-patterns';

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save pattern');

      alert(isEdit ? '更新しました' : '作成しました');
      await fetchPatterns();
      
      if (!isEdit) {
        setSelectedPatternId('new');
        setFormData({ name: '', prompt: '' });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving pattern:', error);
      alert('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この構成パターンを削除しますか？')) return;

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch(`/api/admin/article-patterns/${id}`, {
        method: 'DELETE',
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to delete pattern');

      alert('削除しました');
      await fetchPatterns();
      setSelectedPatternId('new');
      onSuccess();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      alert('削除に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex">
            <button
              type="button"
              onClick={() => setSelectedPatternId('new')}
              className={`mx-4 my-2 w-10 h-10 rounded-full border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                selectedPatternId === 'new'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-gray-400 text-gray-400 hover:border-gray-600 hover:text-gray-600'
              }`}
            >
              +
            </button>
            {patterns.map((pattern) => (
              <button
                key={pattern.id}
                type="button"
                onClick={() => setSelectedPatternId(pattern.id)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  selectedPatternId === pattern.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {pattern.name}
                {selectedPatternId === pattern.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(pattern.id);
                    }}
                    className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors ml-2"
                    title="削除"
                  >
                    <svg className="w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* フォームエリア */}
        <div className="flex-1 overflow-y-auto p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FloatingInput
              label="パターン名（例: レビュー形式、まとめ形式）"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              required
            />

            <FloatingInput
              label="プロンプト（Grok APIに渡す指示文）"
              value={formData.prompt}
              onChange={(value) => setFormData({ ...formData, prompt: value })}
              multiline
              rows={6}
              required
            />

            {/* ボタンエリア */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white px-6 py-4 rounded-xl hover:bg-gray-600 transition-colors font-medium"
              >
                キャンセル
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? '処理中...' : selectedPatternId === 'new' ? '作成' : '更新'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
