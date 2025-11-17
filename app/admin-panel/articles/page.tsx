'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { deleteArticle } from '@/lib/firebase/articles-admin';
import { Article, Category, Tag } from '@/types/article';
import { Writer } from '@/types/writer';
import { apiGet } from '@/lib/api-client';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import ArticlePatternModal from '@/components/admin/ArticlePatternModal';
import ScheduledGenerationModal from '@/components/admin/ScheduledGenerationModal';
import AdvancedArticleGeneratorModal from '@/components/admin/AdvancedArticleGeneratorModal';
import { useRouter } from 'next/navigation';

export default function ArticlesPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [articles, setArticles] = useState<Article[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdvancedGeneratorModalOpen, setIsAdvancedGeneratorModalOpen] = useState(false);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  useEffect(() => {
    fetchArticles();
    fetchWriters();
    fetchCategories();
    fetchTags();
  }, []);

  const fetchArticles = async () => {
    try {
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
      setLoading(false);
    } catch (error) {
      console.error('[ArticlesPage] Error fetching articles:', error);
      alert('記事の取得に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
      setLoading(false);
    }
  };

  const fetchWriters = async () => {
    try {
      const data: Writer[] = await apiGet('/api/admin/writers');
      setWriters(data);
    } catch (error) {
      console.error('[ArticlesPage] Error fetching writers:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data: Category[] = await apiGet('/api/admin/categories');
      setCategories(data);
    } catch (error) {
      console.error('[ArticlesPage] Error fetching categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const data: Tag[] = await apiGet('/api/admin/tags');
      setTags(data);
    } catch (error) {
      console.error('[ArticlesPage] Error fetching tags:', error);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除してもよろしいですか？\n\n※ この操作は取り消せません。FirestoreとAlgoliaの両方から削除されます。`)) {
      return;
    }

    try {
      // API経由で削除（FirestoreとAlgoliaの両方から削除）
      const response = await fetch(`/api/admin/articles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete article');
      }

      setArticles(articles.filter((article) => article.id !== id));
      alert('記事を削除しました');
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('記事の削除に失敗しました');
    }
  };

  const handleTogglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });

      if (response.ok) {
        fetchArticles();
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling article published:', error);
      alert('ステータスの更新に失敗しました');
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
        {loading ? null : (
          <div className="space-y-6 animate-fadeIn">
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
            {filteredArticles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? '検索結果がありません' : '記事がまだありません'}
              </div>
            ) : (
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '30%' }}>
                      タイトル&ディスクリプション
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                      ライター
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '8%' }}>
                      公開
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '13%' }}>
                      公開日
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '13%' }}>
                      作成日
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '13%' }}>
                      更新日
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '13%' }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredArticles.map((article) => {
                    const writer = writers.find(w => w.id === article.writerId);
                    return (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {article.featuredImage && (
                            <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={article.featuredImage}
                                alt={article.title}
                                fill
                                className="object-cover"
                                sizes="80px"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {article.title}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {article.excerpt?.substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {writer && (
                          <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden">
                            <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                              {writer.icon ? (
                                <Image
                                  src={writer.icon}
                                  alt={writer.handleName}
                                  fill
                                  className="object-cover"
                                  sizes="24px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-xs font-bold">
                                  {writer.handleName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-900 truncate">{writer.handleName}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        <label className="cursor-pointer inline-flex items-center justify-center">
                          <div className="relative inline-block w-10 h-6">
                            <input
                              type="checkbox"
                              checked={article.isPublished}
                              onChange={() => handleTogglePublished(article.id, article.isPublished)}
                              className="sr-only peer"
                            />
                            <div 
                              className={`absolute inset-0 rounded-full transition-colors ${
                                article.isPublished ? 'bg-blue-600' : 'bg-gray-400'
                              }`}
                            >
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                article.isPublished ? 'translate-x-4' : 'translate-x-0'
                              }`}></div>
                            </div>
                          </div>
                        </label>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500">
                        {new Date(article.publishedAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500">
                        {new Date(article.createdAt || article.publishedAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500">
                        {new Date(article.updatedAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
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
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        )}

        {/* フローティングボタン */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
          {/* 定期実行設定ボタン */}
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="bg-green-600 text-white w-14 h-14 rounded-full hover:bg-green-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="定期実行設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {/* 構成パターン管理ボタン */}
          <button
            onClick={() => setIsPatternModalOpen(true)}
            className="bg-orange-600 text-white w-14 h-14 rounded-full hover:bg-orange-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="構成パターン管理"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* AI高度生成ボタン */}
          <button
            onClick={() => setIsAdvancedGeneratorModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-14 h-14 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="AI高度記事生成"
          >
            <Image src="/ai.svg" alt="AI" width={24} height={24} className="brightness-0 invert" />
          </button>
          
          {/* 新規記事作成ボタン */}
          <Link
            href="/articles/new"
            className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="新規記事を作成"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>

        {/* 構成パターン管理モーダル */}
        <ArticlePatternModal
          isOpen={isPatternModalOpen}
          onClose={() => setIsPatternModalOpen(false)}
          onSuccess={() => {
            // 成功時の処理（必要に応じて）
          }}
        />

        {/* 定期実行設定モーダル */}
        <ScheduledGenerationModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onSuccess={() => {
            // 成功時の処理（必要に応じて）
          }}
          categories={categories}
          writers={writers}
        />

        {/* AI高度記事生成モーダル（新規） */}
        <AdvancedArticleGeneratorModal
          isOpen={isAdvancedGeneratorModalOpen}
          onClose={() => setIsAdvancedGeneratorModalOpen(false)}
          onSuccess={(articleId) => {
            setIsAdvancedGeneratorModalOpen(false);
            fetchArticles(); // 記事一覧を更新
          }}
          categories={categories}
          writers={writers}
        />
      </AdminLayout>
    </AuthGuard>
  );
}

