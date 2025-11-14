'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MenuSettings } from '@/types/theme';

interface HamburgerMenuProps {
  menuSettings: MenuSettings;
  menuBackgroundColor: string;
  menuTextColor: string;
}

export default function HamburgerMenu({ menuSettings, menuBackgroundColor, menuTextColor }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // 有効な追加メニューのみフィルタリング
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
          onClick={closeMenu}
        />
      )}

      {/* メニューパネル */}
      <div
        style={{ 
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '320px',
          backgroundColor: menuBackgroundColor || '#1f2937', 
          color: menuTextColor || '#ffffff',
          zIndex: 9999,
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.3)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-in-out'
        }}
      >
        <div className="flex flex-col h-full">
          {/* 閉じるボタン */}
          <div className="flex justify-end p-6">
            <button
              onClick={closeMenu}
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
              {/* トップ */}
              <li>
                <Link
                  href="/media"
                  onClick={closeMenu}
                  className="block text-lg font-medium hover:opacity-70 transition-opacity"
                >
                  {menuSettings.topLabel || 'トップ'}
                </Link>
              </li>

              {/* 記事一覧 */}
              <li>
                <Link
                  href="/media/articles"
                  onClick={closeMenu}
                  className="block text-lg font-medium hover:opacity-70 transition-opacity"
                >
                  {menuSettings.articlesLabel || '記事一覧'}
                </Link>
              </li>

              {/* 検索 */}
              <li>
                <Link
                  href="/media/search"
                  onClick={closeMenu}
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
                    onClick={closeMenu}
                    className="block text-lg font-medium hover:opacity-70 transition-opacity"
                    target={menu.url.startsWith('http') ? '_blank' : undefined}
                    rel={menu.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {menu.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ハンバーガーボタン */}
      <button
        onClick={toggleMenu}
        className="relative w-12 h-12 flex flex-col items-center justify-center gap-1.5 hover:opacity-80 transition-opacity"
        aria-label="メニュー"
      >
        <span
          style={{ height: '3px' }}
          className={`block w-6 bg-gray-800 rounded-full transition-all duration-300 ${
            isOpen ? 'rotate-45 translate-y-2' : ''
          }`}
        />
        <span
          style={{ height: '3px' }}
          className={`block w-6 bg-gray-800 rounded-full transition-all duration-300 ${
            isOpen ? 'opacity-0' : ''
          }`}
        />
        <span
          style={{ height: '3px' }}
          className={`block w-6 bg-gray-800 rounded-full transition-all duration-300 ${
            isOpen ? '-rotate-45 -translate-y-2' : ''
          }`}
        />
      </button>

      {/* メニューパネルをportalでbodyに直接マウント */}
      {mounted && createPortal(menuPanel, document.body)}
    </>
  );
}

