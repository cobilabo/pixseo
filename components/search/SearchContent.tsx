'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import SimpleSearch from '@/components/search/SimpleSearch';
import ArticleCard from '@/components/articles/ArticleCard';
import { Article } from '@/types/article';
import { searchArticlesWithAlgolia } from '@/lib/algolia/search';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface SearchContentProps {
  faviconUrl?: string;
  mediaId?: string;
  lang?: Lang;
}

// 検索タイプの定義
type SearchType = 'keyword' | 'tag' | 'category';

export default function SearchContent({ faviconUrl, mediaId, lang = 'ja' }: SearchContentProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const tagParam = searchParams.get('tag') || '';       // タグ名パラメータ
  const categoryParam = searchParams.get('category') || ''; // カテゴリー名パラメータ
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState(query);
  const [searchType, setSearchType] = useState<SearchType>('keyword');
  const [searchLabel, setSearchLabel] = useState('');

  // URLパラメータの変更を監視
  useEffect(() => {
    if (tagParam) {
      // タグ検索
      handleTagSearch(tagParam);
    } else if (categoryParam) {
      // カテゴリー検索
      handleCategorySearch(categoryParam);
    } else if (query) {
      // キーワード検索
      handleKeywordSearch(query);
    } else {
      // パラメータが空の場合はクリア
      setArticles([]);
      setKeyword('');
      setSearchLabel('');
      setSearchType('keyword');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tagParam, categoryParam]);

  // キーワード検索
  const handleKeywordSearch = async (searchKeyword: string) => {
    setLoading(true);
    setKeyword(searchKeyword);
    setSearchType('keyword');
    setSearchLabel(searchKeyword);
    
    try {
      // 検索ログを記録
      if (mediaId) {
        fetch('/api/search-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'keyword',
            value: searchKeyword.trim(),
            mediaId,
          }),
        }).catch(err => console.error('Search log error:', err));
      }

      const { articles: results } = await searchArticlesWithAlgolia({
        keyword: searchKeyword,
        lang,
        mediaId,
        hitsPerPage: 50,
      });
      setArticles(results as Article[]);
    } catch (error) {
      console.error('Search error:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // タグ検索（Algolia経由）
  const handleTagSearch = async (tagName: string) => {
    setLoading(true);
    setKeyword('');
    setSearchType('tag');
    setSearchLabel(tagName);
    
    try {
      // 検索ログを記録
      if (mediaId) {
        fetch('/api/search-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'tag',
            value: tagName,
            displayName: tagName,
            mediaId,
          }),
        }).catch(err => console.error('Search log error:', err));
      }

      const { articles: results } = await searchArticlesWithAlgolia({
        tagName: tagName,
        lang,
        mediaId,
        hitsPerPage: 50,
      });
      setArticles(results as Article[]);
    } catch (error) {
      console.error('Tag search error:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // カテゴリー検索（Algolia経由）
  const handleCategorySearch = async (categoryName: string) => {
    setLoading(true);
    setKeyword('');
    setSearchType('category');
    setSearchLabel(categoryName);
    
    try {
      const { articles: results } = await searchArticlesWithAlgolia({
        categoryName: categoryName,
        lang,
        mediaId,
        hitsPerPage: 50,
      });
      setArticles(results as Article[]);
    } catch (error) {
      console.error('Category search error:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // キーワード検索フォームからの検索
  const handleSearch = (searchKeyword: string) => {
    handleKeywordSearch(searchKeyword);
  };

  // 検索結果のタイトル
  const getSearchResultTitle = () => {
    switch (searchType) {
      case 'tag':
        return `${t('search.tagSearchResults', lang)}: ${searchLabel}`;
      case 'category':
        return `${t('search.categorySearchResults', lang)}: ${searchLabel}`;
      default:
        return `${articles.length}${t('section.searchResults', lang)}`;
    }
  };

  // 検索結果がない場合のメッセージ
  const getNoResultsMessage = () => {
    if (searchType === 'tag') {
      return t('message.noTagArticles', lang);
    } else if (searchType === 'category') {
      return t('message.noCategoryArticles', lang);
    } else if (keyword) {
      return t('message.noSearchResults', lang);
    }
    return t('message.enterSearchKeyword', lang);
  };

  return (
    <>
      {/* シンプル検索（キーワード検索用） */}
      <SimpleSearch onSearch={handleSearch} initialKeyword={keyword} lang={lang} />

      {/* タグ/カテゴリー検索時のバッジ表示 */}
      {(searchType === 'tag' || searchType === 'category') && searchLabel && (
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full">
            {searchType === 'tag' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            )}
            {searchType === 'category' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            )}
            <span className="font-medium">{searchLabel}</span>
          </div>
        </div>
      )}

      {/* 検索結果 */}
      <section>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{t('common.loading', lang)}</p>
          </div>
        ) : articles.length > 0 ? (
          <>
            {/* タイトル部分 - ホームページと同じスタイル */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {getSearchResultTitle()}
              </h2>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {searchType === 'keyword' ? t('section.searchResultsEn', lang) : `${articles.length} articles`}
              </p>
            </div>
            {/* 記事グリッド - ホームページと同じスタイル（2カラム） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} lang={lang} />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 flex flex-col items-center justify-center text-gray-900">
            {faviconUrl ? (
              <div className="relative w-20 h-20 mb-4 opacity-30">
                <Image
                  src={faviconUrl}
                  alt="Site Icon"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <p className="text-sm">
              {getNoResultsMessage()}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
