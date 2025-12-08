'use client';

import { useState, useEffect, useMemo } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import Image from 'next/image';
import { apiGet } from '@/lib/api-client';
import { Writer } from '@/types/writer';
import { Article } from '@/types/article';

type SortColumn = 'handleName' | 'bio' | 'articleCount' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function WritersPage() {
  const [writers, setWriters] = useState<Writer[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchWriters();
  }, []);

  const fetchWriters = async () => {
    try {
      const [writersData, articlesData] = await Promise.all([
        apiGet<Writer[]>('/api/admin/writers'),
        apiGet<Article[]>('/api/admin/articles'),
      ]);
      setWriters(writersData);
      setArticles(articlesData);
    } catch (error) {
      console.error('Error fetching writers:', error);
    } finally {
      setLoading(false);
    }
  };

  // ライターの記事数を計算
  const getWriterArticleCount = (writerId: string): number => {
    return articles.filter(article => article.writerId === writerId).length;
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ライター「${name}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/writers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('ライターを削除しました');
        fetchWriters();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting writer:', error);
      alert('ライターの削除に失敗しました');
    }
  };

  // ソート切り替え
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'createdAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // ソートアイコン
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-3 h-3 ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // フィルタリング + ソート + ページネーション
  const { paginatedWriters, totalPages, totalCount } = useMemo(() => {
    // 1. フィルタリング
    const lowercaseSearch = searchTerm.toLowerCase();
    let filtered = writers.filter((writer) =>
      writer.handleName.toLowerCase().includes(lowercaseSearch) ||
      (writer.bio && writer.bio.toLowerCase().includes(lowercaseSearch))
    );

    // 2. ソート
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'handleName':
          comparison = a.handleName.localeCompare(b.handleName, 'ja');
          break;
        case 'bio':
          comparison = (a.bio || '').localeCompare(b.bio || '', 'ja');
          break;
        case 'articleCount':
          comparison = getWriterArticleCount(a.id) - getWriterArticleCount(b.id);
          break;
        case 'createdAt':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // 3. ページネーション
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedWriters = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedWriters, totalPages, totalCount };
  }, [writers, searchTerm, sortColumn, sortDirection, currentPage, articles]);

  // 検索時は1ページ目に戻る
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="max-w-6xl animate-fadeIn space-y-6">
          {/* 検索バー */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#ddecf8' }}>
            <input
              type="text"
              placeholder="ライターを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* ライター一覧 */}
          <div className="bg-white rounded-xl overflow-hidden">
            {totalCount === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? '検索結果がありません' : 'ライターがまだありません'}
              </div>
            ) : (
              <>
              {/* 件数表示 */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  全{totalCount}件中 {(currentPage - 1) * ITEMS_PER_PAGE + 1}〜{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}件を表示
                </span>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アイコン
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('handleName')}
                    >
                      <div className="flex items-center">
                        ハンドルネーム
                        <SortIcon column="handleName" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('bio')}
                    >
                      <div className="flex items-center">
                        紹介文
                        <SortIcon column="bio" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('articleCount')}
                    >
                      <div className="flex items-center justify-center">
                        記事数
                        <SortIcon column="articleCount" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedWriters.map((writer) => (
                    <tr key={writer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {writer.icon ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image
                              src={writer.icon}
                              alt={writer.handleName}
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
                        <div className="text-sm font-medium text-gray-900">{writer.handleName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {writer.bio || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {getWriterArticleCount(writer.id)} 記事
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {/* 編集ボタン */}
                          <Link
                            href={`/writers/${writer.id}/edit`}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>

                          {/* 削除ボタン */}
                          <button
                            onClick={() => handleDelete(writer.id, writer.handleName)}
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

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 flex justify-center items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && <span className="px-2 text-gray-400">…</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 text-sm rounded-lg border ${
                              currentPage === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        </span>
                      );
                    })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    »
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </div>
        )}

        {/* フローティング追加ボタン */}
        <Link
          href="/writers/new"
          className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50 shadow-custom"
          title="新規ライター作成"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </AdminLayout>
    </AuthGuard>
  );
}
