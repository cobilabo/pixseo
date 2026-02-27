'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lang } from '@/types/lang';

interface SliderArticle {
  id: string;
  title: string;
  slug: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  excerpt?: string;
  categoryNames?: string[];
  publishedAt?: Date | string;
}

interface TopSliderProps {
  articles: SliderArticle[];
  lang: Lang;
  columnCount?: number;
  autoplay?: boolean;
  autoplayInterval?: number;
}

function useResponsiveColumns(baseColumns: number) {
  const [cols, setCols] = useState(baseColumns);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setCols(1);
      else if (w < 1024) setCols(Math.min(baseColumns, 2));
      else setCols(baseColumns);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [baseColumns]);

  return cols;
}

export default function TopSlider({ articles, lang, columnCount = 3, autoplay = true, autoplayInterval = 5 }: TopSliderProps) {
  const total = articles.length;
  const responsiveCols = useResponsiveColumns(columnCount);
  const effectiveCols = Math.min(responsiveCols, total);
  const maxPage = Math.max(0, total - effectiveCols);
  const showControls = total > 1;

  const [currentPage, setCurrentPage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [maxPage, currentPage]);

  const next = useCallback(() => {
    setCurrentPage(prev => prev >= maxPage ? 0 : prev + 1);
  }, [maxPage]);

  const prev = useCallback(() => {
    setCurrentPage(prev => prev <= 0 ? maxPage : prev - 1);
  }, [maxPage]);

  const goTo = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, maxPage)));
  }, [maxPage]);

  useEffect(() => {
    if (maxPage <= 0 || !autoplay || isHovered) return;
    const ms = autoplayInterval * 1000;
    timerRef.current = setInterval(next, ms);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, maxPage, autoplay, autoplayInterval, isHovered]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  };

  if (total === 0) return null;

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const dotCount = maxPage + 1;
  const gapPx = 16;
  const cardWidthPercent = 100 / effectiveCols;

  return (
    <div
      className="top-slider w-full py-6 md:py-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* スライダー本体 + 矢印を含むコンテナ */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* カードスライド領域 */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(calc(-${currentPage * cardWidthPercent}% - ${currentPage * gapPx / effectiveCols}px))`,
              gap: `${gapPx}px`,
            }}
          >
            {articles.map((article, index) => (
              <div
                key={article.id}
                className="flex-shrink-0"
                style={{ width: `calc(${cardWidthPercent}% - ${gapPx * (effectiveCols - 1) / effectiveCols}px)` }}
              >
                <Link
                  href={`/${lang}/articles/${article.slug}`}
                  className="block group"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-gray-100">
                    {article.featuredImage ? (
                      <Image
                        src={article.featuredImage}
                        alt={article.featuredImageAlt || article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes={`(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${Math.round(100 / effectiveCols)}vw`}
                        priority={index === 0}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                    )}
                    {article.categoryNames && article.categoryNames.length > 0 && (
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        {article.categoryNames.map((name, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] font-semibold rounded bg-white/90 text-gray-800 backdrop-blur-sm"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 px-1">
                    <h3 className="text-sm md:text-base font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    {article.publishedAt && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        {formatDate(article.publishedAt)}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* 左右矢印（overflow-hiddenの外側、relativeコンテナ内） */}
        {showControls && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); prev(); }}
              className="absolute left-0 top-[30%] z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/90 shadow-md text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-lg transition-all flex items-center justify-center -translate-x-1/2"
              aria-label="前へ"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={(e) => { e.preventDefault(); next(); }}
              className="absolute right-0 top-[30%] z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/90 shadow-md text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-lg transition-all flex items-center justify-center translate-x-1/2"
              aria-label="次へ"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ドットインジケーター */}
      {showControls && dotCount >= 1 && dotCount <= 15 && (
        <div className="flex justify-center gap-1.5 mt-5">
          {Array.from({ length: dotCount }).map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.preventDefault(); goTo(index); }}
              className={`rounded-full transition-all ${
                index === currentPage
                  ? 'w-6 h-2 bg-gray-800'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`スライド ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
