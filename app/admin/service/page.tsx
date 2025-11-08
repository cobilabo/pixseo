'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

interface MediaTenant {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  subdomain?: string;
  ownerId: string;
  memberIds: string[];
  isActive: boolean;
  createdAt: string;
}

export default function TenantsPage() {
  const { tenants: contextTenants, refreshTenants } = useMediaTenant();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      await refreshTenants();
      setLoading(false);
    };
    fetchTenants();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`サービス「${name}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/service/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('サービスを削除しました');
        refreshTenants();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('サービスの削除に失敗しました');
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-6xl">
          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden">
              {contextTenants.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  サービスがまだありません
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        サービス名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        スラッグ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        カスタムドメイン
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状態
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contextTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{tenant.slug}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {tenant.customDomain || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              tenant.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {tenant.isActive ? 'アクティブ' : '無効'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {/* 編集ボタン */}
                            <Link
                              href={`/admin/service/${tenant.id}/edit`}
                              className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                              title="編集"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>

                            {/* 削除ボタン */}
                            <button
                              onClick={() => handleDelete(tenant.id, tenant.name)}
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
              )}
            </div>
          )}

          {/* フローティング追加ボタン */}
          <Link
            href="/admin/service/new"
            className="fixed bottom-8 right-8 bg-orange-500 text-white w-14 h-14 rounded-full hover:bg-orange-600 transition-all hover:scale-110 flex items-center justify-center z-50 shadow-lg"
            title="新規サービス作成"
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

