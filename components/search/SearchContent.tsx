'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import SimpleSearch from '@/components/search/SimpleSearch';
import ArticleCard from '@/components/articles/ArticleCard';
import { Article } from '@/types/article';
import { searchArticlesWithAlgolia } from '@/lib/algolia/search';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface LocalizedTag {
  id: string;
  name: string;
  slug: string;
}

interface SearchContentProps {
  faviconUrl?: string;
  mediaId?: string;
  lang?: Lang;
  tags?: LocalizedTag[];
  layoutTheme?: string;
}

type SearchType = 'keyword' | 'tag' | 'category';

interface CurrentSearch {
  type: SearchType;
  value: string;
}

const HITS_PER_PAGE = 20;

export default function SearchContent({ faviconUrl, mediaId, lang = 'ja', tags = [], layoutTheme }: SearchContentProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const tagParam = searchParams.get('tag') || '';
  const categoryParam = searchParams.get('category') || '';

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [keyword, setKeyword] = useState(query);
  const [searchType, setSearchType] = useState<SearchType>('keyword');
  const [searchLabel, setSearchLabel] = useState('');
  const [currentSearch, setCurrentSearch] = useState<CurrentSearch | null>(null);
  const [page, setPage] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 検索ログ送信（初回ロード時のみ）
  const logSearch = useCallback(
    (type: SearchType, value: string, displayName?: string) => {
      if (!mediaId) return;
      fetch('/api/search-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          value: value.trim(),
          ...(displayName ? { displayName } : {}),
          mediaId,
        }),
      }).catch((err) => console.error('Search log error:', err));
    },
    [mediaId]
  );

  /**
   * 任意ページの検索結果を取得して articles に append または置換する。
   * append=false の場合は articles をリセットしてセットし直す（新規検索の初回ロード）。
   */
  const fetchPage = useCallback(
    async (search: CurrentSearch, pageToLoad: number, append: boolean) => {
      const baseParams = {
        lang,
        mediaId,
        page: pageToLoad,
        hitsPerPage: HITS_PER_PAGE,
      };
      const callParams =
        search.type === 'tag'
          ? { ...baseParams, tagName: search.value }
          : search.type === 'category'
            ? { ...baseParams, categoryName: search.value }
            : { ...baseParams, keyword: search.value };

      const { articles: results, totalHits: nb } = await searchArticlesWithAlgolia(callParams);
      const cast = results as Article[];

      setTotalHits(nb);
      setArticles((prev) => (append ? [...prev, ...cast] : cast));
      const loadedCount = (append ? articles.length : 0) + cast.length;
      setHasMore(loadedCount < nb && cast.length > 0);
      setPage(pageToLoad);
    },
    [lang, mediaId, articles.length]
  );

  const startSearch = useCallback(
    async (type: SearchType, rawValue: string, displayName?: string) => {
      setLoading(true);
      setSearchType(type);
      setSearchLabel(displayName ?? rawValue);
      if (type === 'keyword') {
        setKeyword(rawValue);
      } else {
        setKeyword('');
      }
      const search: CurrentSearch = { type, value: rawValue };
      setCurrentSearch(search);
      logSearch(type, rawValue, displayName);

      try {
        await fetchPage(search, 0, false);
      } catch (error) {
        console.error('Search error:', error);
        setArticles([]);
        setTotalHits(0);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, logSearch]
  );

  const loadMore = useCallback(async () => {
    if (!currentSearch || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(currentSearch, page + 1, true);
    } catch (error) {
      console.error('Search loadMore error:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [currentSearch, loading, loadingMore, hasMore, page, fetchPage]);

  // URL パラメータの変化で初回検索をトリガー
  useEffect(() => {
    if (tagParam) {
      void startSearch('tag', tagParam, tags.find((t) => t.name === tagParam || t.slug === tagParam)?.name ?? tagParam);
    } else if (categoryParam) {
      void startSearch('category', categoryParam, categoryParam);
    } else if (query) {
      void startSearch('keyword', query, query);
    } else {
      setArticles([]);
      setKeyword('');
      setSearchLabel('');
      setSearchType('keyword');
      setCurrentSearch(null);
      setPage(0);
      setTotalHits(0);
      setHasMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tagParam, categoryParam]);

  // IntersectionObserver による無限スクロール
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleSearch = (searchKeyword: string) => {
    const trimmed = searchKeyword.trim();
    if (!trimmed) {
      setArticles([]);
      setKeyword('');
      setSearchLabel('');
      setSearchType('keyword');
      setCurrentSearch(null);
      setPage(0);
      setTotalHits(0);
      setHasMore(false);
      setLoading(false);
      return;
    }
    void startSearch('keyword', trimmed, trimmed);
  };

  const getSearchResultTitle = () => {
    switch (searchType) {
      case 'tag':
        return `${t('search.tagSearchResults', lang)}: ${searchLabel}`;
      case 'category':
        return `${t('search.categorySearchResults', lang)}: ${searchLabel}`;
      default:
        return `${totalHits}${t('section.searchResults', lang)}`;
    }
  };

  const getNoResultsMessage = () => {
    if (searchType === 'tag') {
      return t('message.noTagArticles', lang);
    } else if (searchType === 'category') {
      return t('message.noCategoryArticles', lang);
    } else if (keyword) {
      return t('message.noSearchResults', lang);
    }
    return '';
  };

  const hasSearchParams = Boolean(query || tagParam || categoryParam);

  return (
    <>
      {layoutTheme !== 'furatto' && (
        <SimpleSearch onSearch={handleSearch} initialKeyword={keyword} lang={lang} />
      )}

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

      <section>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{t('common.loading', lang)}</p>
          </div>
        ) : articles.length > 0 ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {getSearchResultTitle()}
              </h2>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {searchType === 'keyword' ? t('section.searchResultsEn', lang) : `${totalHits} articles`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} lang={lang} />
              ))}
            </div>

            {/* 無限スクロール用 sentinel と状態表示 */}
            <div ref={sentinelRef} className="h-px" aria-hidden="true" />
            {loadingMore && (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">{t('common.loading', lang)}</p>
              </div>
            )}
            {!hasMore && articles.length >= HITS_PER_PAGE && (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400">— {totalHits} / {totalHits} —</p>
              </div>
            )}
          </>
        ) : hasSearchParams ? (
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
        ) : null}
      </section>
    </>
  );
}
