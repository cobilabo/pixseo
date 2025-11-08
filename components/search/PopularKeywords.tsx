'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPopularKeywords } from '@/lib/firebase/search-history';
import { SearchHistory } from '@/types/search';

interface PopularKeywordsProps {
  limit?: number;
}

export default function PopularKeywords({ limit = 10 }: PopularKeywordsProps) {
  const [keywords, setKeywords] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const data = await getPopularKeywords(limit);
        setKeywords(data);
      } catch (error) {
        console.error('Error fetching popular keywords:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKeywords();
  }, [limit]);

  // ローディング中またはキーワードがない場合は何も表示しない
  if (loading || keywords.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        よく検索されているキーワード
      </h3>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <Link
            key={keyword.id}
            href={`/media/search?q=${encodeURIComponent(keyword.keyword)}`}
            className="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-sm transition-colors"
          >
            <span className="mr-1.5 font-semibold text-blue-500">#{index + 1}</span>
            {keyword.keyword}
            <span className="ml-1.5 text-xs text-blue-500">({keyword.count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

