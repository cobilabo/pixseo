'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/media/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="キーワードで検索"
          className="w-full px-6 py-4 pr-16 text-lg text-gray-900 bg-white/80 backdrop-blur-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-base"
        />
        <button
          type="submit"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white w-10 h-10 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary)' }}
          aria-label="検索"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </form>
  );
}



