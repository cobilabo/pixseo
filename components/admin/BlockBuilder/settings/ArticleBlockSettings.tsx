'use client';

/**
 * 記事ブロックの設定
 */

import { useState, useEffect } from 'react';
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
  };

  const selectedArticle = articles.find(a => a.id === config.articleId);

  // 検索フィルタリング
  const filteredArticles = articles.filter(article => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title?.toLowerCase().includes(query) ||
      article.slug?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* 記事検索 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          記事を検索
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="タイトルまたはスラッグで検索..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
      </div>

      {/* 記事選択 */}
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
          <select
            value={config.articleId}
            onChange={(e) => handleArticleSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">記事を選択してください</option>
            {filteredArticles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.title}
              </option>
            ))}
          </select>
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
              onChange={(e) => updateConfig({ displayStyle: 'blogcard' })}
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
              onChange={(e) => updateConfig({ displayStyle: 'text' })}
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
    </div>
  );
}
