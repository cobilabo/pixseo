'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import AIFormGeneratorModal from '@/components/admin/AIFormGeneratorModal';
import { Form } from '@/types/form';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { apiGet } from '@/lib/api-client';

export default function FormsListPage() {
  const { currentTenant } = useMediaTenant();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      fetchForms();
    }
  }, [currentTenant]);

  const fetchForms = async () => {
    try {
      const data: Form[] = await apiGet('/api/admin/forms');
      
      // 作成日でソート（新しい順）
      const sortedData = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setForms(sortedData);
    } catch (error) {
      console.error('Error fetching forms:', error);
      alert('フォームの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？\n送信データもすべて削除されます。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/forms/${id}`, {
        method: 'DELETE',
        headers: {
          'x-media-id': currentTenant?.id || '',
        },
      });

      if (response.ok) {
        setForms(forms.filter((form) => form.id !== id));
        alert('フォームを削除しました');
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('フォームの削除に失敗しました');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/forms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenant?.id || '',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchForms();
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling form status:', error);
      alert('ステータスの更新に失敗しました');
    }
  };

  const filteredForms = forms.filter((form) => {
    const lowercaseSearch = searchTerm.toLowerCase();
    return (
      form.name.toLowerCase().includes(lowercaseSearch) ||
      (form.description && form.description.toLowerCase().includes(lowercaseSearch))
    );
  });

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="space-y-6 animate-fadeIn">
            {/* 検索バー */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#ddecf8' }}>
              <input
                type="text"
                placeholder="フォームを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* フォーム一覧 */}
            <div className="bg-white rounded-xl overflow-hidden">
              {filteredForms.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? '検索結果がありません' : 'フォームがまだありません'}
                </div>
              ) : (
                <table className="w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '35%' }}>
                        フォーム名
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '25%' }}>
                        説明
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                        ステータス
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                        送信数
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredForms.map((form) => (
                      <tr key={form.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {form.name}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs text-gray-500 truncate">
                            {form.description || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <label className="cursor-pointer inline-flex items-center justify-center">
                            <div className="relative inline-block w-12 h-7">
                              <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={() => handleToggleActive(form.id, form.isActive)}
                                className="sr-only"
                              />
                              <div
                                className={`absolute inset-0 rounded-full transition-colors ${
                                  form.isActive ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              >
                                <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                                  form.isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}></div>
                              </div>
                            </div>
                          </label>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <Link
                            href={`/forms/${form.id}/submissions`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {form.submissionCount || 0}件
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {/* 編集ボタン */}
                            <Link
                              href={`/forms/${form.id}/edit`}
                              className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                              title="編集"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>

                            {/* 削除ボタン */}
                            <button
                              onClick={() => handleDelete(form.id, form.name)}
                              className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                              title="削除"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* フローティングボタン */}
        <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
          {/* AI生成ボタン */}
          <button
            onClick={() => setShowAIModal(true)}
            className="w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="AIで生成"
          >
            <Image src="/ai.svg" alt="AI" width={24} height={24} className="brightness-0 invert" />
          </button>

          {/* 新規作成ボタン */}
          <Link
            href="/forms/new"
            className="w-14 h-14 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="新規作成"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>

        {/* AI生成モーダル */}
        {currentTenant && (
          <AIFormGeneratorModal
            isOpen={showAIModal}
            onClose={() => setShowAIModal(false)}
            mediaId={currentTenant.id}
          />
        )}
      </AdminLayout>
    </AuthGuard>
  );
}

