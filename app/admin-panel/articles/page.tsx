'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { deleteArticle } from '@/lib/firebase/articles-admin';
import { Article } from '@/types/article';
import { apiGet } from '@/lib/api-client';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function ArticlesPage() {
  const { currentTenant } = useMediaTenant();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      console.log('[ArticlesPage] Fetching articles from API...');
      
      // API Client経由で取得（mediaIdが自動的にヘッダーに追加される）
      const data: Article[] = await apiGet('/api/admin/articles');
      console.log('[ArticlesPage] Received articles:', data);
      
      // 日付をDateオブジェクトに変換
      const articlesWithDates = data.map(article => ({
        ...article,
        publishedAt: new Date(article.publishedAt),
        updatedAt: new Date(article.updatedAt),
      }));
      
      // クライアント側で更新日時順にソート（新しい順）
      const sortedData = articlesWithDates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      console.log('[ArticlesPage] Sorted articles:', sortedData);
      setArticles(sortedData);
    } catch (error) {
      console.error('[ArticlesPage] Error fetching articles:', error);
      alert('記事の取得に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await deleteArticle(id);
      setArticles(articles.filter((article) => article.id !== id));
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('記事の削除に失敗しました');
    }
  };

  const filteredArticles = articles.filter((article) => {
    const lowercaseSearch = searchTerm.toLowerCase();
    return (
      article.title.toLowerCase().includes(lowercaseSearch) ||
      article.content.toLowerCase().includes(lowercaseSearch)
    );
  });

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* 検索バー */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#ddecf8' }}>
            <input
              type="text"
              placeholder="記事を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* 記事一覧 */}
          <div className="bg-white rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">読み込み中...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? '検索結果がありません' : '記事がまだありません'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイトル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
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
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {article.featuredImage && (
                            <div className="relative w-24 h-16 rounded-xl overflow-hidden mr-4 flex-shrink-0">
                              <Image
                                src={article.featuredImage}
                                alt={article.title}
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {article.title}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {article.excerpt?.substring(0, 80)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            article.isPublished
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {article.isPublished ? '公開中' : '下書き'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(article.updatedAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {/* 編集ボタン */}
                          <Link
                            href={`/articles/${article.id}/edit`}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          
                          {/* プレビューボタン */}
                          <Link
                            href={currentTenant ? `https://${currentTenant.slug}.pixseo.cloud/articles/${article.slug}` : '#'}
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
                            onClick={() => handleDelete(article.id, article.title)}
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

        {/* フローティングボタン：新規記事作成 */}
        <Link
          href="/articles/new"
          className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50"
          title="新規記事を作成"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </AdminLayout>
    </AuthGuard>
  );
}

