'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';

interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastSignInTime?: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/admin/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string, email: string) => {
    if (!confirm(`アカウント「${email}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/accounts/${uid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('アカウントを削除しました');
        fetchAccounts();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('アカウントの削除に失敗しました');
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-6xl">
          {/* 検索・フィルター */}
          <div className="bg-white rounded-xl p-4 mb-6" style={{ backgroundColor: '#ddecf8' }}>
            <input
              type="text"
              placeholder="アカウントを検索..."
              className="w-full px-4 py-2 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* アカウント一覧 */}
          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      メールアドレス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      表示名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作成日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最終ログイン
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accounts.map((account) => (
                    <tr key={account.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{account.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{account.displayName || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(account.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.lastSignInTime
                          ? new Date(account.lastSignInTime).toLocaleDateString('ja-JP')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {/* 編集ボタン */}
                          <Link
                            href={`/admin/accounts/${account.uid}/edit`}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>

                          {/* 削除ボタン */}
                          <button
                            onClick={() => handleDelete(account.uid, account.email)}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                            title="削除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {accounts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  アカウントがまだありません
                </div>
              )}
            </div>
          )}

          {/* フローティング追加ボタン */}
          <Link
            href="/admin/accounts/new"
            className="fixed bottom-8 right-8 bg-orange-500 text-white w-14 h-14 rounded-full hover:bg-orange-600 transition-all hover:scale-110 flex items-center justify-center z-50"
            title="新規アカウント作成"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

