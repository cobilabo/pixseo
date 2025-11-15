'use client';

import { useState } from 'react';
import Image from 'next/image';

interface SimpleSearchProps {
  onSearch: (keyword: string) => void;
  initialKeyword?: string;
}

export default function SimpleSearch({ onSearch, initialKeyword = '' }: SimpleSearchProps) {
  const [keyword, setKeyword] = useState(initialKeyword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
            placeholder="キーワードを入力"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
          />
          <button
            type="submit"
            className="absolute right-3 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--primary-color, #3b82f6)' }}
            aria-label="検索"
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

