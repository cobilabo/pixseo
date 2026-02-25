'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { SiteInfo } from '@/lib/firebase/media-tenant-helper';
import { MenuSettings, NavigationItem, ThemeLayoutId } from '@/types/theme';
import { Lang, SUPPORTED_LANGS } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import HamburgerMenu from './HamburgerMenu';
import SearchPanel from './SearchPanel';

const LANG_SHORT: Record<Lang, string> = { ja: 'JA', en: 'EN', zh: 'ZH', ko: 'KO' };

const FURATTO_LOGO_URL = 'https://storage.googleapis.com/pixseo-1eeef.firebasestorage.app/articles/1762645192138_5s2s79ph8wr.jpg';

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
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLangChange = (newLang: Lang) => {
    const parts = pathname.split('/');
    parts[1] = newLang;
    router.push(parts.join('/'));
    setIsLangOpen(false);
  };

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

  const furattoLogoElement = (
    <Link href={`/${lang}`} className="furatto-logo-link flex items-center flex-shrink-0 h-full">
      <Image
        src={FURATTO_LOGO_URL}
        alt={siteName}
        width={200}
        height={56}
        className="furatto-logo-img h-full w-auto object-contain"
        priority
      />
    </Link>
  );

  if (isFuratto) {
    return (
      <>
        <header className="furatto-header fixed top-0 left-0 right-0 z-50">
          <div className="furatto-header-inner">
            {/* Mobile: ハンバーガー左 + ロゴ中央 */}
            <div className="flex items-center justify-between lg:hidden px-3 h-12">
              <button
                onClick={toggleMenu}
                className="relative w-9 h-9 flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label={t('common.menu', lang)}
              >
                <Image
                  src="/menu.svg"
                  alt={t('common.menu', lang)}
                  width={22}
                  height={22}
                  className="w-[22px] h-[22px]"
                />
              </button>

              <div className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-100px)]">
                {furattoLogoElement}
              </div>

              {/* 右側のスペーサー（バランス用） */}
              <div className="w-9 h-9 flex-shrink-0" />
            </div>

            {/* PC: ロゴ左 + メニュー中央 */}
            <div className="hidden lg:flex items-center px-8 h-14">
              <div className="flex-shrink-0">
                {furattoLogoElement}
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

              {/* 右側：言語切り替え */}
              <div className="flex-shrink-0 flex items-center justify-end w-[120px]" ref={langRef}>
                <div className="relative">
                  <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="furatto-lang-btn flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                    aria-label="言語を選択"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.5 3.5 5.5 3.5 9s-1.3 6.5-3.5 9c-2.2-2.5-3.5-5.5-3.5-9s1.3-6.5 3.5-9z" />
                    </svg>
                    <span>{LANG_SHORT[lang]}</span>
                    <svg className={`w-3 h-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isLangOpen && (
                    <div className="furatto-lang-dropdown absolute top-full mt-1 right-0 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                      {SUPPORTED_LANGS.map((l) => (
                        <button
                          key={l}
                          onClick={() => handleLangChange(l)}
                          className={`furatto-lang-option block w-full text-left px-4 py-2 text-sm transition-colors ${
                            l === lang ? 'font-semibold' : 'font-normal'
                          }`}
                        >
                          <span className="mr-2 text-xs opacity-60">{LANG_SHORT[l]}</span>
                          {l === 'ja' ? '日本語' : l === 'en' ? 'English' : l === 'zh' ? '中文' : '한국어'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
