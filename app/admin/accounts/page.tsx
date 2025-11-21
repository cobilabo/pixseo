'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import Image from 'next/image';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useAuth } from '@/contexts/AuthContext';

interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  logoUrl?: string;
  role?: string;
  mediaIds?: string[];
  createdAt: string;
  lastSignInTime?: string;
}

interface Client {
  id: string;
  clientName: string;
  email: string;
  logoUrl?: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const { user, userRole } = useAuth();
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      // アカウントとクライアントを並列取得
      const [accountsResponse, clientsResponse] = await Promise.all([
        fetch('/api/admin/accounts'),
        fetch('/api/admin/clients'),
      ]);

      if (accountsResponse.ok && clientsResponse.ok) {
        const accountsData: AdminUser[] = await accountsResponse.json();
        const clientsData: Client[] = await clientsResponse.json();
        
        // フィルタリング：
        // 1. super_adminは除外
        // 2. admin@pixseo.cloudは除外
        // 3. 現在のサービスのmemberIdsに含まれるアカウントのみ
        const filteredAccounts = accountsData.filter((account) => {
          // super_admin除外
          if (account.role === 'super_admin') return false;
          
          // admin@pixseo.cloud除外
          if (account.email === 'admin@pixseo.cloud') return false;
          
          // 現在のサービスに紐づいているか
          return currentTenant.memberIds.includes(account.uid);
        });
        
        setAccounts(filteredAccounts);
        setClients(clientsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      fetchData();
    }
  }, [currentTenant, fetchData]);

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
        fetchData();
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
        {loading ? null : (
          <div className="max-w-6xl animate-fadeIn">
          {/* アカウント一覧 */}
          {(
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
                        ロゴ <span className="lowercase">or</span> アイコン
                      </th>
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
                    {accounts.map((account) => {
                      // クライアントのロゴを検索
                      const client = clients.find(c => c.email === account.email);
                      const logoUrl = client?.logoUrl || account.logoUrl;
                      
                      return (
                      <tr key={account.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          {logoUrl ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden">
                              <Image 
                                src={logoUrl} 
                                alt={account.displayName || account.email}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                          )}
                        </td>
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
                              href={`/accounts/${account.uid}/edit`}
                              className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                              title="編集"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>

                            {/* 削除ボタン（表示のみ・機能なし） */}
                            <button
                              disabled
                              className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center cursor-not-allowed opacity-50"
                              title="削除不可（クライアント管理から削除してください）"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
        )}

        {/* フローティング追加ボタン */}
        <Link
          href="/accounts/new"
          className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50 shadow-custom"
          title="新規アカウント作成"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </AdminLayout>
    </AuthGuard>
  );
}
