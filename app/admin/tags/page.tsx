'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { deleteTag } from '@/lib/firebase/tags-admin';
import { Tag, Article } from '@/types/article';
import { apiGet } from '@/lib/api-client';

type SortColumn = 'name' | 'slug' | 'articleCount';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const [tagsData, articlesData] = await Promise.all([
        apiGet<Tag[]>('/api/admin/tags'),
        apiGet<Article[]>('/api/admin/articles'),
      ]);
      setTags(tagsData);
      setArticles(articlesData);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  // タグの使用回数を計算
  const getTagUsageCount = (tagId: string): number => {
    return articles.filter(article => article.tagIds.includes(tagId)).length;
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await deleteTag(id);
      setTags(tags.filter((tag) => tag.id !== id));
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('タグの削除に失敗しました');
    }
  };

  // ソート切り替え
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
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
  const { paginatedTags, totalPages, totalCount } = useMemo(() => {
    // 1. フィルタリング
    const lowercaseSearch = searchTerm.toLowerCase();
    let filtered = tags.filter((tag) =>
      tag.name.toLowerCase().includes(lowercaseSearch) ||
      tag.slug.toLowerCase().includes(lowercaseSearch)
    );

    // 2. ソート
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ja');
          break;
        case 'slug':
          comparison = a.slug.localeCompare(b.slug);
          break;
        case 'articleCount':
          comparison = getTagUsageCount(a.id) - getTagUsageCount(b.id);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // 3. ページネーション
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTags = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedTags, totalPages, totalCount };
  }, [tags, searchTerm, sortColumn, sortDirection, currentPage, articles]);

  // 検索時は1ページ目に戻る
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="space-y-6 animate-fadeIn">
          {/* 検索バー */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#ddecf8' }}>
            <input
              type="text"
              placeholder="タグを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* タグ一覧 */}
          <div className="bg-white rounded-xl overflow-hidden">
            {totalCount === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? '検索結果がありません' : 'タグがまだありません'}
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
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        タグ名
                        <SortIcon column="name" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('slug')}
                    >
                      <div className="flex items-center">
                        スラッグ
                        <SortIcon column="slug" />
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
                  {paginatedTags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tag.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tag.slug}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getTagUsageCount(tag.id)} 記事
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {/* 編集ボタン */}
                          <Link
                            href={`/tags/${tag.id}/edit`}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          
                          {/* 削除ボタン */}
                          <button
                            onClick={() => handleDelete(tag.id, tag.name)}
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

        {/* フローティングボタン：新規タグ作成 */}
        <Link
          href="/tags/new"
          className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50"
          title="新規タグを作成"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </AdminLayout>
    </AuthGuard>
  );
}
