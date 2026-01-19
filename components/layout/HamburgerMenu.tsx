'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MenuSettings, NavigationItem } from '@/types/theme';
import { Lang } from '@/types/lang';
import LanguageSelector from '@/components/common/LanguageSelector';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuSettings: MenuSettings;
  menuBackgroundColor: string;
  menuTextColor: string;
  lang?: Lang;
}

export default function HamburgerMenu({ isOpen, onClose, menuSettings, menuBackgroundColor, menuTextColor, lang = 'ja' }: HamburgerMenuProps) {
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

  // ナビゲーション項目のURLを生成
  const getNavigationUrl = (item: NavigationItem): string => {
    switch (item.type) {
      case 'top':
        return `/${lang}`;
      case 'search':
        return `/${lang}/search`;
      case 'page':
        return item.pageSlug === 'home' ? `/${lang}` : `/${lang}/${item.pageSlug || ''}`;
      default:
        return `/${lang}`;
    }
  };

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
              aria-label="閉じる"
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
              {hasNavigationItems ? (
                // 新形式：ナビゲーション項目を使用
                <>
                  {menuSettings.navigationItems!.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={getNavigationUrl(item)}
                        onClick={onClose}
                        className="block text-lg font-medium hover:opacity-70 transition-opacity"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </>
              ) : (
                // 後方互換性：旧形式のメニュー設定を使用
                <>
                  {/* トップ */}
                  <li>
                    <Link
                      href={`/${lang}`}
                      onClick={onClose}
                      className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    >
                      {menuSettings.topLabel || 'トップ'}
                    </Link>
                  </li>

                  {/* 記事一覧 */}
                  <li>
                    <Link
                      href={`/${lang}/articles`}
                      onClick={onClose}
                      className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    >
                      {menuSettings.articlesLabel || '記事一覧'}
                    </Link>
                  </li>

                  {/* 検索 */}
                  <li>
                    <Link
                      href={`/${lang}/search`}
                      onClick={onClose}
                      className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    >
                      {menuSettings.searchLabel || '検索'}
                    </Link>
                  </li>

                  {/* 区切り線 */}
                  {validCustomMenus.length > 0 && (
                    <li className="pt-4 pb-2">
                      <div className="border-t opacity-30" style={{ borderColor: menuTextColor }} />
                    </li>
                  )}

                  {/* 追加メニュー */}
                  {validCustomMenus.map((menu, index) => (
                    <li key={index}>
                      <Link
                        href={menu.url}
                        onClick={onClose}
                        className="block text-lg font-medium hover:opacity-70 transition-opacity"
                        target={menu.url.startsWith('http') ? '_blank' : undefined}
                        rel={menu.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {menu.label}
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </nav>

          {/* 言語セレクター */}
          <div className="px-8 py-6 border-t" style={{ borderColor: `${menuTextColor}33` }}>
            <LanguageSelector currentLang={lang} variant="sidebar" menuTextColor={menuTextColor} menuBackgroundColor={menuBackgroundColor} />
          </div>
        </div>
      </div>
    </>
  );

  return <>{mounted && createPortal(menuPanel, document.body)}</>;
}

