'use client';

import { useEffect, useState } from 'react';
import { Block } from '@/types/block';
import { Lang } from '@/types/lang';
import TopSlider from '@/components/common/TopSlider';

interface SliderBlockProps {
  block: Block;
  lang?: Lang;
}

export default function SliderBlock({ block, lang = 'ja' as Lang }: SliderBlockProps) {
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
      <div className="w-full bg-gray-100 animate-pulse" style={{ aspectRatio: '16/6' }} />
    );
  }

  if (articles.length === 0) return null;

  return <TopSlider articles={articles} lang={lang} />;
}
