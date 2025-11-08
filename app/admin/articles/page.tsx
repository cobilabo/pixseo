'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAllArticles, deleteArticle } from '@/lib/firebase/articles-admin';
import { Article } from '@/types/article';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await getAllArticles();
      // クライアント側で更新日時順にソート（新しい順）
      const sortedData = data.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setArticles(sortedData);
    } catch (error) {
      console.error('Error fetching articles:', error);
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
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">記事管理</h1>
            <Link
              href="/admin/articles/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <span className="mr-2">✏️</span>
              新規記事を作成
            </Link>
          </div>

          {/* 検索バー */}
          <div className="bg-white shadow rounded-lg p-4">
            <input
              type="text"
              placeholder="記事を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 記事一覧 */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
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
                            <img
                              src={article.featuredImage}
                              alt=""
                              className="w-16 h-16 object-cover rounded mr-4"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {article.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {article.excerpt?.substring(0, 100)}...
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
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/admin/articles/${article.id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            編集
                          </Link>
                          <Link
                            href={`/media/articles/${article.slug}`}
                            target="_blank"
                            className="text-green-600 hover:text-green-900"
                          >
                            プレビュー
                          </Link>
                          <button
                            onClick={() => handleDelete(article.id, article.title)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
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
      </AdminLayout>
    </AuthGuard>
  );
}

