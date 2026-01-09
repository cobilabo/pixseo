'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { deleteArticle } from '@/lib/firebase/articles-admin';
import { Article, Category, Tag } from '@/types/article';
import { Writer } from '@/types/writer';
import { apiGet } from '@/lib/api-client';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter, useSearchParams } from 'next/navigation';

// ソート可能なカラム
type SortColumn = 'title' | 'writer' | 'viewCount' | 'isPublished' | 'publishedAt' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

// 公開ステータスのオプション
type PublishStatus = 'published' | 'unpublished' | 'draft' | 'scheduled';

function ArticlesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();

  const [articles, setArticles] = useState<Article[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // フィルター（URLクエリパラメータから初期化）
  const [filterWriter, setFilterWriter] = useState<string>(searchParams.get('writer') || '');
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get('category') || '');
  const [filterTag, setFilterTag] = useState<string>(searchParams.get('tag') || '');
  const [filterStatus, setFilterStatus] = useState<PublishStatus[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  
  // ソート
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
      
      // 日付をDateオブジェクトに変換（nullの場合はundefinedのまま）
      const articlesWithDates = data.map(article => ({
        ...article,
        publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
        updatedAt: article.updatedAt ? new Date(article.updatedAt) : new Date(),
        createdAt: article.createdAt ? new Date(article.createdAt) : undefined,
      }));
      
      // クライアント側で更新日時順にソート（新しい順）
      const sortedData = articlesWithDates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      console.log('[ArticlesPage] Sorted articles:', sortedData);
      setArticles(sortedData);
      setLoading(false);
    } catch (error) {
      console.error('[ArticlesPage] Error fetching articles:', error);
      showError('記事の取得に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
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
      showSuccess('記事を削除しました');
    } catch (error) {
      console.error('Error deleting article:', error);
      showError('記事の削除に失敗しました');
    }
  };

  const handleTogglePublished = (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // 楽観的UI更新（即座に状態を変更）
    setArticles(prev => prev.map(a => 
      a.id === id ? { ...a, isPublished: newStatus } : a
    ));
    
    // バックグラウンドでAPIを呼び出す（await しない）
    fetch(`/api/admin/articles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isPublished: newStatus }),
    }).then(async (response) => {
      if (response.ok) {
        console.log(`[ArticlesPage] 記事の公開ステータスを更新しました (ID: ${id})`);
        if (newStatus) {
          // 公開に切り替えた場合は、翻訳処理が完了するまで待機
          console.log(`[ArticlesPage] バックグラウンドで翻訳とAlgolia登録を実行中...`);
          // トーストやメッセージを表示したい場合はここに追加
        }
        // 完了後にリストを更新（最新の状態を取得）
        await fetchArticles();
      } else {
        // エラー時は元の状態に戻す
        setArticles(prev => prev.map(a => 
          a.id === id ? { ...a, isPublished: currentStatus } : a
        ));
        showError('ステータスの更新に失敗しました');
      }
    }).catch((error) => {
      console.error('Error toggling article published:', error);
      // エラー時は元の状態に戻す
      setArticles(prev => prev.map(a => 
        a.id === id ? { ...a, isPublished: currentStatus } : a
      ));
      showError('ステータスの更新に失敗しました');
    });
  };

  // ソート切り替え
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1); // ソート変更時は1ページ目に戻る
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

  // 記事のステータスを判定するヘルパー関数
  const getArticleStatus = (article: Article): PublishStatus => {
    // 公開日が設定されていない場合は下書き
    if (!article.publishedAt) return 'draft';
    // 予約公開待ち状態
    if (article.isScheduled) return 'scheduled';
    // 公開中
    if (article.isPublished) return 'published';
    // 公開日が設定されているが非公開
    return 'unpublished';
  };

  // フィルタリング + ソート + ページネーション
  const { paginatedArticles, totalPages, totalCount } = useMemo(() => {
    // 1. テキスト検索フィルタリング
    const lowercaseSearch = searchTerm.toLowerCase();
    let filtered = articles.filter((article) => 
      article.title.toLowerCase().includes(lowercaseSearch) ||
      article.content.toLowerCase().includes(lowercaseSearch)
    );
    
    // 2. ライターフィルター
    if (filterWriter) {
      filtered = filtered.filter(article => article.writerId === filterWriter);
    }
    
    // 3. カテゴリーフィルター
    if (filterCategory) {
      filtered = filtered.filter(article => 
        (article.categoryIds || []).includes(filterCategory)
      );
    }
    
    // 4. タグフィルター
    if (filterTag) {
      filtered = filtered.filter(article => 
        (article.tagIds || []).includes(filterTag)
      );
    }
    
    // 5. 公開ステータスフィルター
    if (filterStatus.length > 0) {
      filtered = filtered.filter(article => 
        filterStatus.includes(getArticleStatus(article))
      );
    }

    // 6. ソート
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'title':
          comparison = a.title.localeCompare(b.title, 'ja');
          break;
        case 'writer':
          const writerA = writers.find(w => w.id === a.writerId)?.handleName || '';
          const writerB = writers.find(w => w.id === b.writerId)?.handleName || '';
          comparison = writerA.localeCompare(writerB, 'ja');
          break;
        case 'viewCount':
          comparison = (a.viewCount || 0) - (b.viewCount || 0);
          break;
        case 'isPublished':
          comparison = (a.isPublished ? 1 : 0) - (b.isPublished ? 1 : 0);
          break;
        case 'publishedAt':
          const pubA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const pubB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          comparison = pubA - pubB;
          break;
        case 'createdAt':
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : (a.publishedAt ? new Date(a.publishedAt).getTime() : 0);
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : (b.publishedAt ? new Date(b.publishedAt).getTime() : 0);
          comparison = createdA - createdB;
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // 7. ページネーション
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedArticles = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedArticles, totalPages, totalCount };
  }, [articles, searchTerm, filterWriter, filterCategory, filterTag, filterStatus, sortColumn, sortDirection, currentPage, writers]);

  // フィルター変更時は1ページ目に戻る
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterWriter, filterCategory, filterTag, filterStatus]);
  
  // ステータスフィルターの切り替え
  const toggleStatusFilter = (status: PublishStatus) => {
    setFilterStatus(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  // フィルターをクリア
  const clearFilters = () => {
    setSearchTerm('');
    setFilterWriter('');
    setFilterCategory('');
    setFilterTag('');
    setFilterStatus([]);
  };
  
  // フィルターが適用されているかどうか
  const hasActiveFilters = searchTerm || filterWriter || filterCategory || filterTag || filterStatus.length > 0;

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="space-y-6 animate-fadeIn">
          {/* 検索バー＆フィルター */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#ddecf8' }}>
            <div className="flex flex-wrap gap-3 items-center">
              {/* 検索入力 */}
              <div className="flex-shrink-0 w-48">
                <input
                  type="text"
                  placeholder="記事を検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                />
              </div>
              
              {/* ライターフィルター */}
              <select
                value={filterWriter}
                onChange={(e) => setFilterWriter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">ライター</option>
                {writers.map(writer => (
                  <option key={writer.id} value={writer.id}>{writer.handleName}</option>
                ))}
              </select>
              
              {/* カテゴリーフィルター */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">カテゴリー</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              
              {/* タグフィルター */}
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">タグ</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
              
              {/* 公開ステータスフィルター（複数選択） */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="px-3 py-2 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 flex items-center gap-2"
                >
                  <span>
                    {filterStatus.length === 0 
                      ? 'ステータス' 
                      : `ステータス (${filterStatus.length})`
                    }
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showStatusDropdown && (
                  <>
                    {/* オーバーレイ */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowStatusDropdown(false)}
                    />
                    {/* ドロップダウン */}
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[140px] z-20">
                      <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterStatus.includes('published')}
                          onChange={() => toggleStatusFilter('published')}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">公開中</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterStatus.includes('unpublished')}
                          onChange={() => toggleStatusFilter('unpublished')}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">非公開</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterStatus.includes('draft')}
                          onChange={() => toggleStatusFilter('draft')}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">下書き</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterStatus.includes('scheduled')}
                          onChange={() => toggleStatusFilter('scheduled')}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">予約中</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
              
              {/* フィルタークリアボタン */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-lg bg-gray-500 text-white text-sm hover:bg-gray-600 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* 記事一覧 */}
          <div className="bg-white rounded-xl overflow-hidden">
            {totalCount === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {hasActiveFilters ? '条件に一致する記事がありません' : '記事がまだありません'}
              </div>
            ) : (
              <>
              {/* 件数表示 */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  全{totalCount}件中 {(currentPage - 1) * ITEMS_PER_PAGE + 1}〜{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}件を表示
                </span>
              </div>
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: '20%' }}
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center">
                        タイトル
                        <SortIcon column="title" />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: '8%' }}
                      onClick={() => handleSort('writer')}
                    >
                      <div className="flex items-center">
                        ライター
                        <SortIcon column="writer" />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      style={{ width: '12%' }}
                    >
                      カテゴリー
                    </th>
                    <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      style={{ width: '10%' }}
                    >
                      タグ
                    </th>
                    <th 
                      className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: '6%' }}
                      onClick={() => handleSort('viewCount')}
                    >
                      <div className="flex items-center justify-end">
                        閲覧数
                        <SortIcon column="viewCount" />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: '6%' }}
                      onClick={() => handleSort('isPublished')}
                    >
                      <div className="flex items-center justify-center">
                        公開
                        <SortIcon column="isPublished" />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: '11%' }}
                      onClick={() => handleSort('publishedAt')}
                    >
                      <div className="flex items-center">
                        公開日
                        <SortIcon column="publishedAt" />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: '11%' }}
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        作成日
                        <SortIcon column="createdAt" />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: '11%' }}
                      onClick={() => handleSort('updatedAt')}
                    >
                      <div className="flex items-center">
                        更新日
                        <SortIcon column="updatedAt" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '9%' }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedArticles.map((article) => {
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
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(article.categoryIds || []).slice(0, 2).map(catId => {
                            const cat = categories.find(c => c.id === catId);
                            return cat ? (
                              <span key={catId} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 truncate max-w-[80px]" title={cat.name}>
                                {cat.name}
                              </span>
                            ) : null;
                          })}
                          {(article.categoryIds || []).length > 2 && (
                            <span className="text-xs text-gray-500">+{(article.categoryIds || []).length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(article.tagIds || []).slice(0, 2).map(tagId => {
                            const tag = tags.find(t => t.id === tagId);
                            return tag ? (
                              <span key={tagId} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 truncate max-w-[80px]" title={tag.name}>
                                {tag.name}
                              </span>
                            ) : null;
                          })}
                          {(article.tagIds || []).length > 2 && (
                            <span className="text-xs text-gray-500">+{(article.tagIds || []).length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right text-xs text-gray-500">
                        {(article.viewCount || 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        {!article.publishedAt ? (
                          // 公開日がない場合は下書きバッジ表示
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            下書き
                          </span>
                        ) : article.isScheduled ? (
                          // 予約公開状態の場合はバッジ表示
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" title="予約公開中 - 公開日になると自動公開されます">
                            予約中
                          </span>
                        ) : (
                          // 通常の公開トグル
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
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500">
                        {article.publishedAt 
                          ? new Date(article.publishedAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : '-'
                        }
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500">
                        {article.createdAt
                          ? new Date(article.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : article.publishedAt
                            ? new Date(article.publishedAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                            : '-'
                        }
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
                            href={currentTenant ? `https://${currentTenant.slug}.pixseo-preview.cloud/ja/articles/${article.slug}` : '#'}
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

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 flex justify-center items-center gap-2">
                  {/* 最初へ */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    «
                  </button>
                  
                  {/* 前へ */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>

                  {/* ページ番号 */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // 現在ページの前後2ページ + 最初と最後のページを表示
                      return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
                    })
                    .map((page, index, array) => {
                      // 省略記号の表示
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

                  {/* 次へ */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                  
                  {/* 最後へ */}
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

        {/* フローティングボタン */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
          {/* 定期実行設定ボタン */}
          <Link
            href="/articles/schedule"
            className="bg-green-600 text-white w-14 h-14 rounded-full hover:bg-green-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="定期実行設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>

          {/* AI高度生成ボタン */}
          <Link
            href="/articles/generate"
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-14 h-14 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
            title="AI高度記事生成"
          >
            <Image src="/ai.svg" alt="AI" width={24} height={24} className="brightness-0 invert" />
          </Link>
          
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
      </AdminLayout>
    </AuthGuard>
  );
}

