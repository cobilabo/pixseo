'use client';

/**
 * 記事ブロックの設定
 */

import { useState, useEffect, useMemo } from 'react';
import { Block, ArticleBlockConfig } from '@/types/block';
import { Article } from '@/types/article';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

interface ArticleBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function ArticleBlockSettings({ block, onUpdate }: ArticleBlockSettingsProps) {
  const config = block.config as ArticleBlockConfig;
  const { currentTenant } = useMediaTenant();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      fetchArticles();
    }
  }, [currentTenant]);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/admin/articles', {
        headers: {
          'x-media-id': currentTenant?.id || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // 公開済みの記事のみフィルタリング
        const publishedArticles = data.filter((article: Article) => article.isPublished);
        // 公開日の降順でソート
        publishedArticles.sort((a: Article, b: Article) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        });
        setArticles(publishedArticles);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<ArticleBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  const handleArticleTypeChange = (type: 'single' | 'recent' | 'popular') => {
    updateConfig({
      articleType: type,
      // リセット
      articleId: type === 'single' ? config.articleId : '',
      articleSlug: type === 'single' ? config.articleSlug : '',
      articleTitle: type === 'single' ? config.articleTitle : '',
    });
  };

  const handleArticleSelect = (articleId: string) => {
    const selectedArticle = articles.find(a => a.id === articleId);
    if (selectedArticle) {
      updateConfig({
        articleId: articleId,
        articleSlug: selectedArticle.slug,
        articleTitle: selectedArticle.title,
      });
    } else {
      updateConfig({
        articleId: '',
        articleSlug: '',
        articleTitle: '',
      });
    }
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const selectedArticle = articles.find(a => a.id === config.articleId);

  // 検索フィルタリング
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        article.title?.toLowerCase().includes(query) ||
        article.slug?.toLowerCase().includes(query)
      );
    });
  }, [articles, searchQuery]);

  return (
    <div className="space-y-4">
      {/* 記事タイプ選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          表示タイプ
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="articleType"
              value="single"
              checked={config.articleType === 'single'}
              onChange={() => handleArticleTypeChange('single')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">個別記事を選択</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="articleType"
              value="recent"
              checked={config.articleType === 'recent'}
              onChange={() => handleArticleTypeChange('recent')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">新着記事一覧</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="articleType"
              value="popular"
              checked={config.articleType === 'popular'}
              onChange={() => handleArticleTypeChange('popular')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">人気記事一覧</span>
          </label>
        </div>
      </div>

      {/* 個別記事選択時のUI */}
      {config.articleType === 'single' && (
        <>
          {/* 記事選択（検索付きプルダウン） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              記事選択 *
            </label>
            {loading ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                読み込み中...
              </div>
            ) : articles.length === 0 ? (
              <div className="w-full px-3 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
                公開済みの記事がありません。先に記事を公開してください。
              </div>
            ) : (
              <div className="relative">
                {/* 選択ボックス */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-left flex items-center justify-between bg-white"
                >
                  <span className={selectedArticle ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedArticle ? selectedArticle.title : '記事を選択してください'}
                  </span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* ドロップダウン */}
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    {/* 検索入力 */}
                    <div className="p-2 border-b border-gray-200">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="タイトルまたはスラッグで検索..."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                        autoFocus
                      />
                    </div>
                    
                    {/* 記事リスト */}
                    <div className="max-h-60 overflow-y-auto">
                      {/* 選択解除オプション */}
                      <button
                        type="button"
                        onClick={() => handleArticleSelect('')}
                        className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
                      >
                        選択を解除
                      </button>
                      
                      {filteredArticles.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          該当する記事がありません
                        </div>
                      ) : (
                        filteredArticles.map((article) => (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() => handleArticleSelect(article.id)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                              config.articleId === article.id ? 'bg-blue-100 text-blue-800' : 'text-gray-900'
                            }`}
                          >
                            <div className="font-medium truncate">{article.title}</div>
                            <div className="text-xs text-gray-500 truncate">{article.slug}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 選択中の記事情報 */}
          {selectedArticle && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">{selectedArticle.title}</p>
              <p className="text-xs text-blue-600 mt-1">
                スラッグ: {selectedArticle.slug}
              </p>
              {selectedArticle.publishedAt && (
                <p className="text-xs text-blue-500 mt-1">
                  公開日: {new Date(selectedArticle.publishedAt).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
          )}

          {/* 表示形式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              表示形式
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="displayStyle"
                  value="blogcard"
                  checked={config.displayStyle === 'blogcard'}
                  onChange={() => updateConfig({ displayStyle: 'blogcard' })}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">ブログカード形式</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="displayStyle"
                  value="text"
                  checked={config.displayStyle === 'text'}
                  onChange={() => updateConfig({ displayStyle: 'text' })}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">テキストリンク形式</span>
              </label>
            </div>
          </div>

          {/* プレビュー表示 */}
          {selectedArticle && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プレビュー
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                {config.displayStyle === 'blogcard' ? (
                  <div className="flex gap-3 bg-white border border-gray-200 rounded overflow-hidden">
                    {/* サムネイル */}
                    <div className="w-16 h-16 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                      {selectedArticle.featuredImage ? (
                        <img
                          src={selectedArticle.featuredImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    {/* テキスト */}
                    <div className="flex-1 py-2 pr-3">
                      <p className="text-xs text-gray-500">関連記事</p>
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{selectedArticle.title}</p>
                    </div>
                  </div>
                ) : (
                  <a className="text-blue-600 hover:underline text-sm">
                    {selectedArticle.title}
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 新着/人気記事一覧時のUI */}
      {(config.articleType === 'recent' || config.articleType === 'popular') && (
        <>
          {/* 表示件数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              表示件数
            </label>
            <select
              value={config.displayCount || 4}
              onChange={(e) => updateConfig({ displayCount: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value={2}>2件</option>
              <option value={4}>4件</option>
              <option value={6}>6件</option>
              <option value={8}>8件</option>
              <option value={10}>10件</option>
              <option value={12}>12件</option>
            </select>
          </div>

          {/* プレビュー説明 */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              {config.articleType === 'recent' ? (
                <>
                  最新の記事を<strong>{config.displayCount || 4}件</strong>表示します。
                  <br />
                  トップページと同じカードUIで表示されます。
                </>
              ) : (
                <>
                  人気の記事（閲覧数順）を<strong>{config.displayCount || 4}件</strong>表示します。
                  <br />
                  トップページと同じカードUIで表示されます。
                </>
              )}
            </p>
          </div>
        </>
      )}

      {/* クリックで閉じる背景 */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsDropdownOpen(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
}
