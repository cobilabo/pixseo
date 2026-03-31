'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { SiteInfo } from '@/lib/firebase/media-tenant-helper';
import { MenuSettings, NavigationItem, SnsSettings, ThemeLayoutId } from '@/types/theme';
import { Lang, SUPPORTED_LANGS } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import { getNavigationItemUrl } from '@/lib/navigation-url';
import HamburgerMenu from './HamburgerMenu';
import SearchPanel from './SearchPanel';

const LANG_SHORT: Record<Lang, string> = { ja: 'JA', en: 'EN', zh: 'ZH', ko: 'KO' };

const FURATTO_LOGO_URL = 'https://storage.googleapis.com/pixseo-1eeef.firebasestorage.app/articles/1762645192138_5s2s79ph8wr.jpg';

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
  snsSettings?: SnsSettings;
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
  snsSettings,
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
  const logoHref = siteInfo?.logoLinkPath ? `/${lang}${siteInfo.logoLinkPath}` : `/${lang}`;
  const instagramUsername = snsSettings?.instagramUsername?.trim();

  const logoElement = (
    <Link href={logoHref} className="flex items-center flex-shrink-0">
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
    <Link href={logoHref} className="furatto-logo-link flex items-center flex-shrink-0">
      <Image
        src={FURATTO_LOGO_URL}
        alt={siteName}
        width={200}
        height={56}
        className="furatto-logo-img w-auto object-contain"
        priority
      />
    </Link>
  );

  const [headerKeyword, setHeaderKeyword] = useState('');

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerKeyword.trim()) return;
    router.push(`/${lang}/search?q=${encodeURIComponent(headerKeyword.trim())}`);
    setHeaderKeyword('');
  };

  if (isFuratto) {
    return (
      <>
        <header className="furatto-header fixed top-0 left-0 right-0 z-50">
          <div className="furatto-header-inner">
            {/* ===== モバイル ===== */}
            <div className="lg:hidden">
              {/* 上段: ハンバーガー + ロゴ */}
              <div className="flex items-center justify-between px-3 py-3">
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

                <div className="absolute left-1/2 -translate-x-1/2">
                  {furattoLogoElement}
                </div>

                {instagramUsername ? (
                  <a
                    href={`https://www.instagram.com/${instagramUsername}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 hover:opacity-80 transition-opacity flex-shrink-0"
                    aria-label="Instagram"
                  >
                    <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                ) : (
                  <div className="w-9 h-9 flex-shrink-0" />
                )}
              </div>

              {/* 下段: 検索フィールド（中央） */}
              <div className="px-3 pb-3">
                <form onSubmit={handleHeaderSearch} className="relative">
                  <input
                    type="text"
                    value={headerKeyword}
                    onChange={(e) => setHeaderKeyword(e.target.value)}
                    placeholder={t('search.keywordPlaceholder', lang)}
                    className="furatto-header-search-input w-full pl-3 pr-9 py-2 text-sm rounded-full bg-gray-100 focus:outline-none focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--ft-primary)] transition-colors"
                    aria-label={t('common.search', lang)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>

            {/* ===== PC ===== */}
            <div className="hidden lg:flex items-center px-8 py-2">
              {/* 左: ロゴ */}
              <div className="flex-shrink-0 pr-6">
                {furattoLogoElement}
              </div>

              {/* 中央: 検索 + ナビ */}
              <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <form onSubmit={handleHeaderSearch} className="furatto-header-search relative w-full max-w-md">
                  <input
                    type="text"
                    value={headerKeyword}
                    onChange={(e) => setHeaderKeyword(e.target.value)}
                    placeholder={t('search.keywordPlaceholder', lang)}
                    className="furatto-header-search-input w-full pl-4 pr-10 py-2 text-sm rounded-full bg-gray-100 focus:outline-none focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--ft-primary)] transition-colors"
                    aria-label={t('common.search', lang)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>

                {globalNavItems.length > 0 && (
                  <nav className="furatto-header-nav flex items-center justify-center" aria-label="Global navigation">
                    <div className="flex items-center gap-1">
                      {globalNavItems.map((item) => (
                        <Link
                          key={item.id}
                          href={getNavigationItemUrl(item, lang)}
                          className="furatto-header-nav-link px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          {getNavItemLabel(item, lang)}
                        </Link>
                      ))}
                    </div>
                  </nav>
                )}
              </div>

              {/* 右: IG + 言語 + 公式サイトボタン */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1.5 pl-6">
                <div className="flex items-center gap-2">
                  {instagramUsername && (
                    <a
                      href={`https://www.instagram.com/${instagramUsername}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="furatto-header-ig-btn w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 hover:opacity-80 transition-opacity"
                      aria-label="Instagram"
                    >
                      <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </a>
                  )}

                  <div className="relative" ref={langRef}>
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

                <a
                  href={`/${lang}/home`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Ayumiの公式サイトはこちら
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
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
