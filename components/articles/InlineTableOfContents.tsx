'use client';

import { useState, useEffect } from 'react';
import { TableOfContentsItem } from '@/types/article';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface InlineTableOfContentsProps {
  items: TableOfContentsItem[];
  lang?: Lang;
}

export default function InlineTableOfContents({ items, lang = 'ja' }: InlineTableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (!Array.isArray(items) || items.length === 0) return;

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
      if (item?.id) {
        const element = document.getElementById(item.id);
        if (element) observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  if (!Array.isArray(items) || items.length === 0) return null;

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="toc-inline not-prose my-8 bg-gray-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-4 bg-gray-100 hover:bg-gray-200/60 transition-colors"
      >
        <span className="text-base font-bold text-gray-800">{t('article.toc', lang)}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <nav className="px-5 py-4">
          <ul className="list-none m-0 p-0 space-y-0.5">
            {items.map((item) => {
              if (!item?.id || !item?.text) return null;
              const isActive = activeId === item.id;
              const isSubItem = item.level >= 3;

              return (
                <li key={item.id} className={`m-0 p-0 ${isSubItem ? 'ml-5' : ''}`}>
                  <button
                    onClick={() => handleClick(item.id)}
                    className={`
                      w-full text-left py-1.5 px-2 rounded transition-colors duration-150
                      ${isActive
                        ? 'text-blue-700 font-semibold'
                        : 'text-gray-700 hover:text-blue-600'
                      }
                      ${isSubItem ? 'text-sm' : 'text-sm font-medium'}
                    `}
                  >
                    {item.text}
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
