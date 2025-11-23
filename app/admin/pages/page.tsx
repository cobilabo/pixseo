'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import AIPageGeneratorModal from '@/components/admin/AIPageGeneratorModal';
import { deletePage } from '@/lib/firebase/pages-admin';
import { Page } from '@/types/page';
import { apiGet } from '@/lib/api-client';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function PagesListPage() {
  const { currentTenant } = useMediaTenant();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      console.log('[PagesListPage] Fetching pages from API...');
      
      const data: Page[] = await apiGet('/api/admin/pages');
      console.log('[PagesListPage] Received pages:', data);
      
      // 日付をDateオブジェクトに変換
      const pagesWithDates = data.map(page => ({
        ...page,
        publishedAt: new Date(page.publishedAt),
        updatedAt: new Date(page.updatedAt),
      }));
      
      // 表示順でソート
      const sortedData = pagesWithDates.sort((a, b) => a.order - b.order);
      console.log('[PagesListPage] Sorted pages:', sortedData);
      setPages(sortedData);
      setLoading(false);
    } catch (error) {
      console.error('[PagesListPage] Error fetching pages:', error);
      alert('固定ページの取得に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await deletePage(id);
      setPages(pages.filter((page) => page.id !== id));
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('固定ページの削除に失敗しました');
    }
  };

  const handleTogglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/pages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });

      if (response.ok) {
        fetchPages();
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling page published:', error);
      alert('ステータスの更新に失敗しました');
    }
  };

  const filteredPages = pages.filter((page) => {
    const lowercaseSearch = searchTerm.toLowerCase();
    return (
      page.title.toLowerCase().includes(lowercaseSearch) ||
      page.content.toLowerCase().includes(lowercaseSearch)
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
                placeholder="固定ページを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* 固定ページ一覧 */}
            <div className="bg-white rounded-xl overflow-hidden">
              {filteredPages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? '検索結果がありません' : '固定ページがまだありません'}
                </div>
              ) : (
                <table className="w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '40%' }}>
                        タイトル&ディスクリプション
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                        表示順
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                        ステータス
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                        更新日
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPages.map((page) => (
                      <tr key={page.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {page.featuredImage && (
                              <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={page.featuredImage}
                                  alt={page.title}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {page.title}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {page.excerpt?.substring(0, 60) || page.slug}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{page.order}</span>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <label className="cursor-pointer inline-flex items-center justify-center">
                            <div className="relative inline-block w-12 h-7">
                              <input
                                type="checkbox"
                                checked={page.isPublished}
                                onChange={() => handleTogglePublished(page.id, page.isPublished)}
                                className="sr-only"
                              />
                              <div 
                                className={`absolute inset-0 rounded-full transition-colors ${
                                  page.isPublished ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              >
                                <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                                  page.isPublished ? 'translate-x-5' : 'translate-x-0'
                                }`}></div>
                              </div>
                            </div>
                          </label>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">
                            {page.updatedAt.toLocaleDateString('ja-JP')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {page.updatedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {/* 編集ボタン */}
                            <Link
                              href={`/pages/${page.id}/edit`}
                              className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                              title="編集"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            
                            {/* プレビューボタン */}
                            <Link
                              href={currentTenant ? `https://${currentTenant.slug}.pixseo-preview.cloud/ja/${page.slug}` : '#'}
                              target="_blank"
                              className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center transition-colors"
                              title="プレビュー"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            
                            {/* 削除ボタン */}
                            <button
                              onClick={() => handleDelete(page.id, page.title)}
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
            href="/pages/new"
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
          <AIPageGeneratorModal
            isOpen={showAIModal}
            onClose={() => setShowAIModal(false)}
            mediaId={currentTenant.id}
          />
        )}
      </AdminLayout>
    </AuthGuard>
  );
}

