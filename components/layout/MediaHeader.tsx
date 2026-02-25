'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SiteInfo } from '@/lib/firebase/media-tenant-helper';
import { MenuSettings, NavigationItem, ThemeLayoutId } from '@/types/theme';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import HamburgerMenu from './HamburgerMenu';
import SearchPanel from './SearchPanel';

const getNavItemUrl = (item: NavigationItem, lang: Lang): string => {
  switch (item.type) {
    case 'top':
      return `/${lang}`;
    case 'search':
      return `/${lang}/search`;
    case 'page':
      return item.pageSlug ? `/${lang}/${item.pageSlug}` : `/${lang}`;
    case 'category':
      return item.categorySlug ? `/${lang}/categories/${item.categorySlug}` : `/${lang}`;
    default:
      return `/${lang}`;
  }
};

const getNavItemLabel = (item: NavigationItem, lang: Lang): string => {
  const langKey = `label_${lang}` as keyof NavigationItem;
  return (item[langKey] as string) || item.label || '';
};

interface MediaHeaderProps {
  siteName: string;
  siteInfo?: SiteInfo;
  menuSettings?: MenuSettings;
  menuBackgroundColor?: string;
  menuTextColor?: string;
  lang?: Lang;
  layoutTheme?: ThemeLayoutId;
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
  lang = 'ja',
  layoutTheme,
}: MediaHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const globalNavItems = menuSettings.globalNavItems || [];
  const isFuratto = layoutTheme === 'furatto';

  const logoElement = (
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
  );

  if (isFuratto) {
    return (
      <>
        <header className="furatto-header fixed top-0 left-0 right-0 z-50">
          <div className="furatto-header-inner">
            {/* Mobile: ハンバーガー左 + ロゴ中央 */}
            <div className="flex items-center justify-between lg:hidden px-4 py-3">
              <button
                onClick={toggleMenu}
                className="relative w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label={t('common.menu', lang)}
              >
                <Image
                  src="/menu.svg"
                  alt={t('common.menu', lang)}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </button>

              <div className="absolute left-1/2 -translate-x-1/2">
                {logoElement}
              </div>

              {/* 右側のスペーサー（バランス用） */}
              <div className="w-10 h-10 flex-shrink-0" />
            </div>

            {/* PC: ロゴ左 + メニュー中央 */}
            <div className="hidden lg:flex items-center px-8 py-3">
              <div className="flex-shrink-0">
                {logoElement}
              </div>

              {globalNavItems.length > 0 && (
                <nav className="flex-1 flex items-center justify-center" aria-label="Global navigation">
                  <div className="flex items-center gap-1">
                    {globalNavItems.map((item) => (
                      <Link
                        key={item.id}
                        href={getNavItemUrl(item, lang)}
                        className="furatto-header-nav-link px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        {getNavItemLabel(item, lang)}
                      </Link>
                    ))}
                  </div>
                </nav>
              )}

              {/* 右側のスペーサー（ロゴと対称） */}
              <div className="flex-shrink-0 w-[120px]" />
            </div>
          </div>
        </header>

        <HamburgerMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          menuSettings={menuSettings}
          menuBackgroundColor={menuBackgroundColor}
          menuTextColor={menuTextColor}
          lang={lang}
        />
      </>
    );
  }

  return (
    <>
      <header className="fixed top-4 left-0 right-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-full shadow-lg backdrop-blur-md bg-white/80 px-6 py-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
            <div className="flex items-center justify-between">
              {/* 左：ハンバーガーメニュー */}
              <button
                onClick={toggleMenu}
                className="relative w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label={t('common.menu', lang)}
              >
                <Image
                  src="/menu.svg"
                  alt={t('common.menu', lang)}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </button>

              {logoElement}

              {/* 右：検索アイコン */}
              <button
                onClick={toggleSearch}
                className="relative w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label={t('common.search', lang)}
              >
                <Image
                  src="/search.svg"
                  alt={t('common.search', lang)}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        menuSettings={menuSettings}
        menuBackgroundColor={menuBackgroundColor}
        menuTextColor={menuTextColor}
        lang={lang}
      />

      <SearchPanel
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        lang={lang}
      />
    </>
  );
}
