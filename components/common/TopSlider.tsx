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
}

const AUTOPLAY_INTERVAL = 5000;

export default function TopSlider({ articles, lang }: TopSliderProps) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);

  const total = articles.length;

  const goTo = useCallback((index: number) => {
    setCurrent((index + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (total <= 1 || isHovered) return;
    timerRef.current = setInterval(next, AUTOPLAY_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, total, isHovered]);

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

  return (
    <div
      className="top-slider relative w-full overflow-hidden bg-gray-900"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full" style={{ aspectRatio: '16/6' }}>
        {articles.map((article, index) => (
          <Link
            key={article.id}
            href={`/${lang}/articles/${article.slug}`}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            aria-hidden={index !== current}
            tabIndex={index === current ? 0 : -1}
          >
            {article.featuredImage ? (
              <Image
                src={article.featuredImage}
                alt={article.featuredImageAlt || article.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority={index === 0}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-14">
              {article.categoryNames && article.categoryNames.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {article.categoryNames.map((name, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-xs font-semibold rounded-full bg-white/90 text-gray-800 backdrop-blur-sm"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              <h2 className="text-white text-lg md:text-2xl lg:text-3xl font-bold leading-snug line-clamp-2 drop-shadow-lg">
                {article.title}
              </h2>

              {article.publishedAt && (
                <p className="text-white/70 text-xs md:text-sm mt-2 drop-shadow">
                  {formatDate(article.publishedAt)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors flex items-center justify-center"
            aria-label="前へ"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors flex items-center justify-center"
            aria-label="次へ"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {articles.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.preventDefault(); goTo(index); }}
                className={`rounded-full transition-all ${
                  index === current
                    ? 'w-8 h-2.5 bg-white'
                    : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`スライド ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
