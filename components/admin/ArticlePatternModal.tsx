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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchPatterns();
    }
  }, [isOpen]);

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

      const url = editingId
        ? `/api/admin/article-patterns/${editingId}`
        : '/api/admin/article-patterns';

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save pattern');

      alert(editingId ? '更新しました' : '作成しました');
      setFormData({ name: '', description: '', prompt: '' });
      setEditingId(null);
      fetchPatterns();
    } catch (error) {
      console.error('Error saving pattern:', error);
      alert('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pattern: ArticlePattern) => {
    setFormData({
      name: pattern.name,
      description: pattern.description,
      prompt: pattern.prompt,
    });
    setEditingId(pattern.id);
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
      fetchPatterns();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      alert('削除に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">記事構成パターン管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            レビュー形式、まとめ形式、疑問形式などの構成パターンを登録
          </p>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 新規作成・編集フォーム */}
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'パターン編集' : '新規パターン作成'}
            </h3>
            
            <div className="space-y-4">
              <FloatingInput
                label="パターン名（例: レビュー形式、まとめ形式）"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              <FloatingInput
                label="説明（任意）"
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                multiline
                rows={2}
              />

              <FloatingInput
                label="プロンプト（Grok APIに渡す指示文）"
                value={formData.prompt}
                onChange={(value) => setFormData({ ...formData, prompt: value })}
                multiline
                rows={6}
                required
                placeholder="例: 以下の構成で記事を作成してください：
1. 導入（問題提起）
2. 課題の深堀り
3. 解決策の提示
4. 具体例・事例
5. まとめ・アクションプラン"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '処理中...' : editingId ? '更新' : '作成'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: '', description: '', prompt: '' });
                    }}
                    className="bg-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-400 transition-colors"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* パターン一覧 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">登録済みパターン</h3>
            
            {patterns.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                まだ構成パターンが登録されていません
              </p>
            ) : (
              patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {pattern.name}
                      </h4>
                      {pattern.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {pattern.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(pattern)}
                        className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg hover:bg-blue-50"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(pattern.id)}
                        className="text-red-600 hover:text-red-800 px-3 py-1 rounded-lg hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">プロンプト:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {pattern.prompt}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-400 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

