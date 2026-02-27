'use client';

import { useEffect, useState } from 'react';
import { Block, SliderBlockConfig } from '@/types/block';
import { Lang } from '@/types/lang';
import TopSlider from '@/components/common/TopSlider';

interface SliderBlockProps {
  block: Block;
  lang?: Lang;
}

export default function SliderBlock({ block, lang = 'ja' as Lang }: SliderBlockProps) {
  const config = block.config as SliderBlockConfig;
  const columnCount = config.columnCount ?? 3;

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSliderArticles = async () => {
      try {
        const res = await fetch(`/api/articles/slider?lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles || []);
        }
      } catch (error) {
        console.error('Failed to fetch slider articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSliderArticles();
  }, [lang]);

  if (loading) {
    return (
      <div className="w-full py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
            {Array.from({ length: columnCount }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[16/10] bg-gray-200 rounded-lg" />
                <div className="mt-3 h-4 bg-gray-200 rounded w-3/4" />
                <div className="mt-2 h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (articles.length === 0) return null;

  return <TopSlider articles={articles} lang={lang} columnCount={columnCount} />;
}
