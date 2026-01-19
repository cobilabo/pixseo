'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { getCustomBlocksByMediaId, deleteCustomBlock } from '@/lib/firebase/custom-blocks-admin';
import { CustomBlock } from '@/types/custom-block';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';

export default function CustomBlocksPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant?.id) {
      fetchCustomBlocks();
    }
  }, [currentTenant]);

  const fetchCustomBlocks = async () => {
    if (!currentTenant?.id) return;
    
    try {
      setLoading(true);
      const blocks = await getCustomBlocksByMediaId(currentTenant.id);
      setCustomBlocks(blocks);
    } catch (error) {
      console.error('Error fetching custom blocks:', error);
      showError('カスタムブロックの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await deleteCustomBlock(id);
      showSuccess('カスタムブロックを削除しました');
      fetchCustomBlocks();
    } catch (error) {
      console.error('Error deleting custom block:', error);
      showError('カスタムブロックの削除に失敗しました');
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="px-4 pb-8 animate-fadeIn">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">カスタムブロック</h1>
            <Link
              href="/admin/custom-blocks/new"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              + 新規作成
            </Link>
          </div>

          {/* カスタムブロック一覧 */}
          <div className="bg-white rounded-[1.75rem] shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : customBlocks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">カスタムブロックがまだありません</p>
                <Link
                  href="/admin/custom-blocks/new"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  最初のカスタムブロックを作成
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ブロック名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        作成日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        更新日
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customBlocks.map((block) => (
                      <tr key={block.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{block.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {block.createdAt.toLocaleDateString('ja-JP')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {block.updatedAt.toLocaleDateString('ja-JP')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/admin/custom-blocks/${block.id}/edit`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            編集
                          </Link>
                          <button
                            onClick={() => handleDelete(block.id, block.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
