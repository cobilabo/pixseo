'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { MenuSettings, NavigationItem, ThemeLayoutId } from '@/types/theme';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import { getNavigationItemUrl } from '@/lib/navigation-url';
import LanguageSelector from '@/components/common/LanguageSelector';

const getItemLabel = (item: NavigationItem, lang: Lang): string => {
  const langKey = `label_${lang}` as keyof NavigationItem;
  return (item[langKey] as string) || item.label || '';
};

const getMenuLabel = (menu: any, field: string, lang: Lang): string => {
  const langKey = `${field}_${lang}`;
  return menu[langKey] || menu[field] || '';
};

const COBI_CONTACT_LABEL: Record<Lang, string> = {
  ja: 'CONTACT', en: 'CONTACT', zh: 'CONTACT', ko: 'CONTACT',
};

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuSettings: MenuSettings;
  menuBackgroundColor: string;
  menuTextColor: string;
  lang?: Lang;
  layoutTheme?: ThemeLayoutId;
  faviconUrl?: string;
}

export default function HamburgerMenu({ isOpen, onClose, menuSettings, menuBackgroundColor, menuTextColor, lang = 'ja', layoutTheme, faviconUrl }: HamburgerMenuProps) {
  const isCobi = layoutTheme === 'cobi';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // メニューが開いているときはスクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 新形式のナビゲーション項目があるかチェック
  const hasNavigationItems = menuSettings.navigationItems && menuSettings.navigationItems.length > 0;

  // 有効な追加メニューのみフィルタリング（後方互換性）
  const validCustomMenus = menuSettings.customMenus?.filter(menu => menu.label && menu.url) || [];

  const menuPanel = (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998
          }}
          onClick={onClose}
        />
      )}

      {/* メニューパネル */}
      <div
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: '320px',
          backgroundColor: menuBackgroundColor || '#1f2937', 
          color: menuTextColor || '#ffffff',
          zIndex: 9999,
          boxShadow: '4px 0 12px rgba(0, 0, 0, 0.3)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease-in-out'
        }}
      >
        <div className="flex flex-col h-full">
          {/* 閉じるボタン */}
          <div className="flex justify-start p-6">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
              aria-label={t('common.close', lang)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* メニューリスト */}
          <nav className="flex-1 px-8 py-4">
            <ul className="space-y-6">
              {isCobi ? (
                <>
                  <li>
                    <Link
                      href={`/${lang}`}
                      onClick={onClose}
                      className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    >
                      {getMenuLabel(menuSettings, 'topLabel', lang) || t('nav.top', lang)}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${lang}/contact`}
                      onClick={onClose}
                      className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    >
                      {COBI_CONTACT_LABEL[lang]}
                    </Link>
                  </li>
                </>
              ) : hasNavigationItems ? (
                <>
                  {menuSettings.navigationItems!.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={getNavigationItemUrl(item, lang)}
                        onClick={onClose}
                        className="block text-lg font-medium hover:opacity-70 transition-opacity"
                      >
                        {getItemLabel(item, lang)}
                      </Link>
                    </li>
                  ))}
                </>
              ) : (
                <>
                  <li>
                    <Link
                      href={`/${lang}`}
                      onClick={onClose}
                      className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    >
                      {getMenuLabel(menuSettings, 'topLabel', lang) || t('nav.top', lang)}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${lang}/articles`}
                      onClick={onClose}
                      className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    >
                      {getMenuLabel(menuSettings, 'articlesLabel', lang) || t('nav.articles', lang)}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${lang}/search`}
                      onClick={onClose}
                      className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    >
                      {getMenuLabel(menuSettings, 'searchLabel', lang) || t('nav.search', lang)}
                    </Link>
                  </li>
                  {validCustomMenus.length > 0 && (
                    <li className="pt-4 pb-2">
                      <div className="border-t opacity-30" style={{ borderColor: menuTextColor }} />
                    </li>
                  )}
                  {validCustomMenus.map((menu, index) => (
                    <li key={index}>
                      <Link
                        href={menu.url}
                        onClick={onClose}
                        className="block text-lg font-medium hover:opacity-70 transition-opacity"
                        target={menu.url.startsWith('http') ? '_blank' : undefined}
                        rel={menu.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {getMenuLabel(menu, 'label', lang)}
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </nav>

          {/* cobi: ファビコン揺りかごアニメーション / それ以外: 言語セレクター */}
          {isCobi ? (
            faviconUrl ? (
              <div className="px-8 py-6 flex justify-center">
                <Image
                  src={faviconUrl}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10"
                  style={{ animation: 'cobi-cradle 3s ease-in-out infinite' }}
                  unoptimized={faviconUrl.endsWith('.svg')}
                />
              </div>
            ) : null
          ) : (
            <div className="px-8 py-6 border-t" style={{ borderColor: `${menuTextColor}33` }}>
              <LanguageSelector currentLang={lang} variant="sidebar" menuTextColor={menuTextColor} menuBackgroundColor={menuBackgroundColor} />
            </div>
          )}
        </div>
      </div>
    </>
  );

  return <>{mounted && createPortal(menuPanel, document.body)}</>;
}

