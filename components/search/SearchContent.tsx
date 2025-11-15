'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import FilterSearch from '@/components/search/FilterSearch';
import ArticleCard from '@/components/articles/ArticleCard';
import { Article } from '@/types/article';
import { searchArticles } from '@/lib/firebase/search';

interface SearchContentProps {
  faviconUrl?: string;
}

export default function SearchContent({ faviconUrl }: SearchContentProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    categoryId: '',
    tagId: '',
    keyword: query,
  });

  useEffect(() => {
    if (query) {
      handleSearch(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSearch = async (keyword: string) => {
    setLoading(true);
    try {
      const results = await searchArticles({
        keyword,
        categoryId: filters.categoryId || undefined,
        tagId: filters.tagId || undefined,
      });
      setArticles(results);
    } catch (error) {
      console.error('Search error:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    if (newFilters.keyword || newFilters.categoryId || newFilters.tagId) {
      handleSearch(newFilters.keyword);
    }
  };

  return (
    <>
      {/* 絞り込み検索 */}
      <section className="mb-8">
        <FilterSearch
          filters={filters}
          onChange={handleFilterChange}
        />
      </section>

      {/* 検索結果 */}
      <section>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">検索中...</p>
          </div>
        ) : articles.length > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-gray-600">
                {articles.length}件の記事が見つかりました
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
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
              {query || filters.categoryId || filters.tagId
                ? '記事が見つかりませんでした'
                : '検索キーワードを入力してください'}
            </p>
          </div>
        )}
      </section>
    </>
  );
}

