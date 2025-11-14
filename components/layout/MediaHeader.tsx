'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { SiteInfo } from '@/lib/firebase/media-tenant-helper';
import { MenuSettings } from '@/types/theme';
import HamburgerMenu from './HamburgerMenu';

interface MediaHeaderProps {
  siteName: string;
  siteInfo?: SiteInfo;
  menuSettings?: MenuSettings;
  menuBackgroundColor?: string;
  menuTextColor?: string;
}

export default function MediaHeader({ 
  siteName, 
  siteInfo,
  menuSettings = {
    topLabel: 'トップ',
    articlesLabel: '記事一覧',
    searchLabel: '検索',
    customMenus: [],
  },
  menuBackgroundColor = '#1f2937',
  menuTextColor = '#ffffff',
}: MediaHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/media/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        {/* ロゴとハンバーガーメニュー */}
        <div className="rounded-full shadow-lg backdrop-blur-md bg-white/70 px-6 py-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
          <div className="flex items-center justify-between">
            <Link href="/media" className="flex items-center space-x-3">
              <div className="flex items-center gap-3">
                {siteInfo?.faviconUrl && (
                  <Image
                    src={siteInfo.faviconUrl}
                    alt={`${siteName} アイコン`}
                    width={32}
                    height={32}
                    className="w-8 h-8"
                    priority
                    unoptimized={siteInfo.faviconUrl.endsWith('.svg')}
                  />
                )}
                {siteInfo?.logoUrl ? (
                  <Image
                    src={siteInfo.logoUrl}
                    alt={siteName}
                    width={120}
                    height={32}
                    className="h-8 w-auto"
                    priority
                    unoptimized={siteInfo.logoUrl.endsWith('.svg')}
                  />
                ) : (
                  <span className="text-xl font-bold text-gray-900">
                    {siteName}
                  </span>
                )}
              </div>
            </Link>
            <HamburgerMenu
              menuSettings={menuSettings}
              menuBackgroundColor={menuBackgroundColor}
              menuTextColor={menuTextColor}
            />
          </div>
        </div>

        {/* キーワード検索 */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードで検索"
              className="w-full px-6 py-3 pr-14 text-base text-gray-900 bg-white/80 backdrop-blur-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-sm"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white w-9 h-9 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
              aria-label="検索"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}

