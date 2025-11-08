'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useAuth } from '@/contexts/AuthContext';

interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
  mediaIds?: string[];
  createdAt: string;
  lastSignInTime?: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const { user, userRole } = useAuth();
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      fetchAccounts();
    }
  }, [currentTenant]);

  const fetchAccounts = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin/accounts');
      if (response.ok) {
        const data: AdminUser[] = await response.json();
        
        // フィルタリング：
        // 1. super_adminは除外
        // 2. admin@pixseo.cloudは除外
        // 3. 現在のサービスのmemberIdsに含まれるアカウントのみ
        const filteredAccounts = data.filter((account) => {
          // super_admin除外
          if (account.role === 'super_admin') return false;
          
          // admin@pixseo.cloud除外
          if (account.email === 'admin@pixseo.cloud') return false;
          
          // 現在のサービスに紐づいているか
          return currentTenant.memberIds.includes(account.uid);
        });
        
        setAccounts(filteredAccounts);
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

  if (!currentTenant) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-600">サービスを選択してください</p>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-6xl">
          {/* アカウント一覧 */}
          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden">
              {accounts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  このサービスに紐づくアカウントはありません
                </div>
              ) : (
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr key={account.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{account.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{account.displayName || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {new Date(account.createdAt).toLocaleDateString('ja-JP')}
                          </div>
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

                            {/* 削除ボタン（表示のみ・機能なし） */}
                            <button
                              disabled
                              className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center cursor-not-allowed opacity-50"
                              title="削除不可（クライアント管理から削除してください）"
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
              )}
            </div>
          )}

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>注意:</strong> このページには、選択中のサービスに紐づくアカウントのみが表示されます。<br />
              アカウントの追加・削除は「クライアント管理」から行ってください。
            </p>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
