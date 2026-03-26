'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface SimpleSearchProps {
  onSearch: (keyword: string) => void;
  initialKeyword?: string;
  lang?: Lang;
}

export default function SimpleSearch({ onSearch, initialKeyword = '', lang = 'ja' }: SimpleSearchProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);

  useEffect(() => {
    setKeyword(initialKeyword);
  }, [initialKeyword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (keyword.trim()) {
      router.push(`/${lang}/search/?q=${encodeURIComponent(keyword.trim())}`);
    } else {
      router.push(`/${lang}/search/`);
    }

    onSearch(keyword);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="relative flex items-center bg-gray-100 rounded-full py-3 px-3 pr-12">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('message.enterSearchKeyword', lang)}
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
          />
          <button
            type="submit"
            className="absolute right-3 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--primary-color, #3b82f6)' }}
            aria-label={t('common.search', lang)}
          >
            <Image
              src="/search.svg"
              alt=""
              width={16}
              height={16}
              className="brightness-0 invert"
            />
          </button>
        </div>
      </div>
    </form>
  );
}
