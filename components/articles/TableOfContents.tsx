'use client';

import { TableOfContentsItem } from '@/types/article';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import { normalizeTocDisplayText } from '@/lib/article-utils';
import { useState, useEffect } from 'react';

interface TableOfContentsProps {
  items: TableOfContentsItem[];
  lang?: Lang;
}

export default function TableOfContents({ items, lang = 'ja' }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  // デフォルトで開いた状態にする（記事間で開閉挙動を統一）
  const [isOpen, setIsOpen] = useState<boolean>(true);

  useEffect(() => {
    // 配列チェック
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    items.forEach((item) => {
      if (item && item.id) {
        const element = document.getElementById(item.id);
        if (element) observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  // 配列でない場合の安全チェック（useEffect の後）
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="toc-card not-prose bg-white rounded-xl shadow-md border-l-3 border-blue-600 p-5 mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full ${isOpen ? 'mb-4 pb-3 border-b border-gray-200' : ''}`}
      >
        <h2 className="text-lg font-bold text-gray-900">{t('article.toc', lang)}</h2>
        <svg 
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <nav>
          <ul className="toc-inline">
            {items.map((item, index) => {
              // 各アイテムの安全チェック
              if (!item || !item.id || !item.text) {
                return null;
              }
              
              const isActive = activeId === item.id;
              const isParentLevel = item.level === 2;
              const hasPriorParent = items
                .slice(0, index)
                .some((x) => x?.level === 2);
              const showParentBorder = isParentLevel && hasPriorParent;
              const levelStyles = {
                2: 'ml-0 text-base font-semibold',
                3: 'ml-4 text-sm font-medium',
                4: 'ml-8 text-sm font-normal',
              };
              
              return (
                <li
                  key={item.id || `toc-${index}`}
                  className={`${levelStyles[item.level as keyof typeof levelStyles] || 'ml-0'} ${showParentBorder ? 'border-t border-gray-200 pt-1.5 mt-1.5' : ''}`}
                >
                  <button
                    onClick={() => handleClick(item.id)}
                    className={`
                      w-full text-left py-1 px-3 rounded-md transition-all duration-150
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                      }
                    `}
                  >
                    <span className="leading-tight block">
                      {normalizeTocDisplayText(item.text)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

