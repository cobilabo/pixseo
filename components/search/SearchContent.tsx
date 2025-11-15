'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import SimpleSearch from '@/components/search/SimpleSearch';
import ArticleCard from '@/components/articles/ArticleCard';
import { Article } from '@/types/article';
import { searchArticlesWithAlgolia } from '@/lib/algolia/search';
import { Lang } from '@/types/lang';

interface SearchContentProps {
  faviconUrl?: string;
  mediaId?: string;
  lang?: Lang;
}

export default function SearchContent({ faviconUrl, mediaId, lang = 'ja' }: SearchContentProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState(query);

  useEffect(() => {
    if (query) {
      handleSearch(query);
    } else {
      // URLパラメーターが空になったら検索結果とキーワードをクリア
      setArticles([]);
      setKeyword('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSearch = async (searchKeyword: string) => {
    setLoading(true);
    setKeyword(searchKeyword);
    try {
      const { articles: results } = await searchArticlesWithAlgolia({
        keyword: searchKeyword,
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

  return (
    <>
      {/* シンプル検索 */}
      <SimpleSearch onSearch={handleSearch} initialKeyword={keyword} />

      {/* 検索結果 */}
      <section>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">検索中...</p>
          </div>
        ) : articles.length > 0 ? (
          <>
            {/* タイトル部分 - ホームページと同じスタイル */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {articles.length}件の記事が見つかりました
              </h2>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Search Results</p>
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
              {keyword
                ? '記事が見つかりませんでした'
                : '検索キーワードを入力してください'}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
