'use client';

import { useState, useEffect, useMemo } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Image from 'next/image';
import { apiGet } from '@/lib/api-client';
import { Writer } from '@/types/writer';
import { Article } from '@/types/article';
import { useToast } from '@/contexts/ToastContext';
import {
  SortIcon,
  Pagination,
  SearchBar,
  FloatingAddButton,
  TableCountDisplay,
  ActionButtons,
  EmptyState,
} from '@/components/admin/common';

type SortColumn = 'handleName' | 'bio' | 'articleCount' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function WritersPage() {
  const { showSuccess, showError } = useToast();
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
        showSuccess('ライターを削除しました');
        fetchWriters();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting writer:', error);
      showError('ライターの削除に失敗しました');
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'createdAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const { paginatedWriters, totalPages, totalCount } = useMemo(() => {
    const lowercaseSearch = searchTerm.toLowerCase();
    let filtered = writers.filter((writer) =>
      writer.handleName.toLowerCase().includes(lowercaseSearch) ||
      (writer.bio && writer.bio.toLowerCase().includes(lowercaseSearch))
    );

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

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedWriters = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedWriters, totalPages, totalCount };
  }, [writers, searchTerm, sortColumn, sortDirection, currentPage, articles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="max-w-6xl animate-fadeIn space-y-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ライターを検索..."
            />

            <div className="bg-white rounded-xl overflow-hidden">
              {totalCount === 0 ? (
                <EmptyState hasSearch={!!searchTerm} entityName="ライター" />
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
                          アイコン
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('handleName')}
                        >
                          <div className="flex items-center">
                            ハンドルネーム
                            <SortIcon column="handleName" currentColumn={sortColumn} direction={sortDirection} />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('bio')}
                        >
                          <div className="flex items-center">
                            紹介文
                            <SortIcon column="bio" currentColumn={sortColumn} direction={sortDirection} />
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
                            <ActionButtons
                              editHref={`/writers/${writer.id}/edit`}
                              onDelete={() => handleDelete(writer.id, writer.handleName)}
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

        <FloatingAddButton href="/writers/new" title="新規ライター作成" />
      </AdminLayout>
    </AuthGuard>
  );
}
