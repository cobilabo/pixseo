'use client';

import { useEffect, useState, useMemo } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { deleteCategory } from '@/lib/firebase/categories-admin';
import { Category, Article } from '@/types/article';
import { apiGet } from '@/lib/api-client';
import {
  SortIcon,
  Pagination,
  SearchBar,
  FloatingAddButton,
  TableCountDisplay,
  ActionButtons,
  Toggle,
  EmptyState,
} from '@/components/admin/common';

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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const { paginatedCategories, totalPages, totalCount } = useMemo(() => {
    const lowercaseSearch = searchTerm.toLowerCase();
    let filtered = categories.filter((category) =>
      category.name.toLowerCase().includes(lowercaseSearch) ||
      category.slug.toLowerCase().includes(lowercaseSearch)
    );

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

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCategories = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedCategories, totalPages, totalCount };
  }, [categories, searchTerm, sortColumn, sortDirection, currentPage, articles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="space-y-6 animate-fadeIn">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="カテゴリーを検索..."
            />

            <div className="bg-white rounded-xl overflow-hidden">
              {totalCount === 0 ? (
                <EmptyState hasSearch={!!searchTerm} entityName="カテゴリー" />
              ) : (
                <>
                  <TableCountDisplay
                    totalCount={totalCount}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
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
                            <SortIcon column="name" currentColumn={sortColumn} direction={sortDirection} />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('slug')}
                        >
                          <div className="flex items-center">
                            スラッグ
                            <SortIcon column="slug" currentColumn={sortColumn} direction={sortDirection} />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('articleCount')}
                        >
                          <div className="flex items-center justify-center">
                            記事数
                            <SortIcon column="articleCount" currentColumn={sortColumn} direction={sortDirection} />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('isRecommended')}
                        >
                          <div className="flex items-center">
                            おすすめ
                            <SortIcon column="isRecommended" currentColumn={sortColumn} direction={sortDirection} />
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
                            <Toggle
                              checked={category.isRecommended || false}
                              onChange={() => handleToggleRecommended(category.id, category.isRecommended || false)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <ActionButtons
                              editHref={`/categories/${category.id}/edit`}
                              onDelete={() => handleDelete(category.id, category.name)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          </div>
        )}

        <FloatingAddButton href="/categories/new" title="新規カテゴリーを作成" />
      </AdminLayout>
    </AuthGuard>
  );
}
