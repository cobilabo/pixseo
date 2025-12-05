'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { deleteCategory } from '@/lib/firebase/categories-admin';
import { Category, Article } from '@/types/article';
import { apiGet } from '@/lib/api-client';

type SortColumn = 'name' | 'slug' | 'articleCount' | 'isRecommended';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [categoriesData, articlesData] = await Promise.all([
        apiGet<Category[]>('/api/admin/categories'),
        apiGet<Article[]>('/api/admin/articles'),
      ]);
      setCategories(categoriesData);
      setArticles(articlesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // カテゴリーの使用回数を計算
  const getCategoryUsageCount = (categoryId: string): number => {
    return articles.filter(article => article.categoryIds.includes(categoryId)).length;
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await deleteCategory(id);
      setCategories(categories.filter((category) => category.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('カテゴリーの削除に失敗しました');
    }
  };

  const handleToggleRecommended = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRecommended: !currentStatus }),
      });

      if (response.ok) {
        fetchCategories();
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling category recommended:', error);
      alert('おすすめ状態の更新に失敗しました');
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
  const { paginatedCategories, totalPages, totalCount } = useMemo(() => {
    // 1. フィルタリング
    const lowercaseSearch = searchTerm.toLowerCase();
    let filtered = categories.filter((category) =>
      category.name.toLowerCase().includes(lowercaseSearch) ||
      category.slug.toLowerCase().includes(lowercaseSearch)
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
          comparison = getCategoryUsageCount(a.id) - getCategoryUsageCount(b.id);
          break;
        case 'isRecommended':
          comparison = (a.isRecommended ? 1 : 0) - (b.isRecommended ? 1 : 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // 3. ページネーション
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCategories = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedCategories, totalPages, totalCount };
  }, [categories, searchTerm, sortColumn, sortDirection, currentPage, articles]);

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
              placeholder="カテゴリーを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* カテゴリー一覧 */}
          <div className="bg-white rounded-xl overflow-hidden">
            {totalCount === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? '検索結果がありません' : 'カテゴリーがまだありません'}
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
                      画像
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        カテゴリー名
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
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('isRecommended')}
                    >
                      <div className="flex items-center">
                        おすすめ
                        <SortIcon column="isRecommended" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {category.name}
                        </div>
                        {category.description && (
                          <div className="text-sm text-gray-500 max-w-md truncate" title={category.description}>
                            {category.description.length > 60 
                              ? `${category.description.substring(0, 60)}...` 
                              : category.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.slug}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {getCategoryUsageCount(category.id)} 記事
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="cursor-pointer">
                          <div className="relative inline-block w-14 h-8">
                            <input
                              type="checkbox"
                              checked={category.isRecommended || false}
                              onChange={() => handleToggleRecommended(category.id, category.isRecommended || false)}
                              className="sr-only"
                            />
                            <div 
                              className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
                                category.isRecommended ? 'bg-blue-600' : 'bg-gray-400'
                              }`}
                            >
                              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                                category.isRecommended ? 'translate-x-6' : 'translate-x-0'
                              }`}></div>
                            </div>
                          </div>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {/* 編集ボタン */}
                          <Link
                            href={`/categories/${category.id}/edit`}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          
                          {/* 削除ボタン */}
                          <button
                            onClick={() => handleDelete(category.id, category.name)}
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
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                : 'border-gray-300 bg-white hover:bg-gray-100'
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
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* フローティングボタン：新規カテゴリー作成 */}
        <Link
          href="/categories/new"
          className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50"
          title="新規カテゴリーを作成"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </AdminLayout>
    </AuthGuard>
  );
}
