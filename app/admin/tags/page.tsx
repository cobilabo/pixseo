'use client';

import { useEffect, useState, useMemo } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { deleteTag } from '@/lib/firebase/tags-admin';
import { Tag, Article } from '@/types/article';
import { apiGet } from '@/lib/api-client';
import {
  SortIcon,
  Pagination,
  SearchBar,
  FloatingAddButton,
  TableCountDisplay,
  ActionButtons,
  EmptyState,
} from '@/components/admin/common';

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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const { paginatedTags, totalPages, totalCount } = useMemo(() => {
    const lowercaseSearch = searchTerm.toLowerCase();
    let filtered = tags.filter((tag) =>
      tag.name.toLowerCase().includes(lowercaseSearch) ||
      tag.slug.toLowerCase().includes(lowercaseSearch)
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
          comparison = getTagUsageCount(a.id) - getTagUsageCount(b.id);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTags = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedTags, totalPages, totalCount };
  }, [tags, searchTerm, sortColumn, sortDirection, currentPage, articles]);

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
              placeholder="タグを検索..."
            />

            <div className="bg-white rounded-xl overflow-hidden">
              {totalCount === 0 ? (
                <EmptyState hasSearch={!!searchTerm} entityName="タグ" />
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
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center">
                            タグ名
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
                            <ActionButtons
                              editHref={`/tags/${tag.id}/edit`}
                              onDelete={() => handleDelete(tag.id, tag.name)}
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

        <FloatingAddButton href="/tags/new" title="新規タグを作成" />
      </AdminLayout>
    </AuthGuard>
  );
}
