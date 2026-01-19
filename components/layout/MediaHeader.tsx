'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SiteInfo } from '@/lib/firebase/media-tenant-helper';
import { MenuSettings } from '@/types/theme';
import { Lang } from '@/types/lang';
import HamburgerMenu from './HamburgerMenu';
import SearchPanel from './SearchPanel';

interface CustomMenuItem {
  label: string;
  url: string;
  openInNewTab?: boolean;
}

interface MediaHeaderProps {
  siteName: string;
  siteInfo?: SiteInfo;
  menuSettings?: MenuSettings;
  menuBackgroundColor?: string;
  menuTextColor?: string;
  customMenu?: CustomMenuItem[];
  lang?: Lang;
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
  customMenu,
  lang = 'ja',
}: MediaHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  return (
    <>
      <header className="fixed top-4 left-0 right-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-full shadow-lg backdrop-blur-md bg-white/80 px-6 py-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
            {/* ハンバーガー、ロゴ、検索を配置 */}
            <div className="flex items-center justify-between">
              {/* 左：ハンバーガーメニュー */}
              <button
                onClick={toggleMenu}
                className="relative w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label="メニュー"
              >
                <Image
                  src="/menu.svg"
                  alt="メニュー"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </button>

              {/* 中央：ロゴ */}
              <Link href={`/${lang}`} className="flex items-center flex-shrink-0">
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

              {/* 右：検索アイコン */}
              <button
                onClick={toggleSearch}
                className="relative w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label="検索"
              >
                <Image
                  src="/search.svg"
                  alt="検索"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ハンバーガーメニューパネル（左から） */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        menuSettings={menuSettings}
        menuBackgroundColor={menuBackgroundColor}
        menuTextColor={menuTextColor}
        customMenu={customMenu}
        lang={lang}
      />

      {/* 検索パネル（左から） */}
      <SearchPanel
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        lang={lang}
      />
    </>
  );
}

