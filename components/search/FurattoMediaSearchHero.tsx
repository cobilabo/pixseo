'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  isHiddenFromLists?: boolean;
}

interface FurattoMediaSearchHeroProps {
  lang: Lang;
  tags?: unknown[];
  categories?: CategoryItem[];
  noBackground?: boolean;
}

export default function FurattoMediaSearchHero({
  lang,
  categories = [],
  noBackground = false,
}: FurattoMediaSearchHeroProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');

  const visibleCategories = categories.filter(cat => !cat.isHiddenFromLists);

  const handleKeywordSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    router.push(`/${lang}/search?q=${encodeURIComponent(keyword.trim())}`);
  };

  return (
    <div className={noBackground ? 'relative' : 'furatto-media-search-hero relative overflow-hidden'}>
      {!noBackground && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300" />
          <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none select-none overflow-hidden" aria-hidden="true" style={{ top: '-40%' }}>
            <span className="furatto-media-search-watermark text-white/[0.15] font-black tracking-widest whitespace-nowrap">
              KEYWORD
            </span>
          </div>
        </>
      )}

      {/* コンテンツ */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* カテゴリー検索（角丸ボタン一覧） */}
        {visibleCategories.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap justify-center gap-2">
              {visibleCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${lang}/categories/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/85 backdrop-blur-sm text-sm font-medium text-gray-700 shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
