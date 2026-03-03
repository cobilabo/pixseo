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

  let h2Count = 0;
  const h2CountMap = new Map<number, number>();

  const numberedItems = items.map((item, index) => {
    if (item.level === 2) {
      h2Count++;
      h2CountMap.set(index, h2Count);
      return { ...item, number: `${h2Count}` };
    }
    if (item.level === 3) {
      let parentH2 = 0;
      let subCount = 0;
      for (let i = index - 1; i >= 0; i--) {
        if (items[i].level === 2) {
          parentH2 = h2CountMap.get(i) || 0;
          break;
        }
      }
      for (let i = index - 1; i >= 0; i--) {
        if (items[i].level === 2) break;
        if (items[i].level === 3) subCount++;
      }
      return { ...item, number: `${parentH2}-${subCount + 1}` };
    }
    return { ...item, number: '' };
  });

  return (
    <div className="toc-inline not-prose my-8 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-4 bg-gray-100 hover:bg-gray-150 transition-colors"
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
          <ol className="list-none m-0 p-0 space-y-1">
            {numberedItems.map((item) => {
              if (!item?.id || !item?.text) return null;
              const isActive = activeId === item.id;
              const isSubItem = item.level >= 3;

              return (
                <li key={item.id} className={`m-0 p-0 ${isSubItem ? 'ml-6' : ''}`}>
                  <button
                    onClick={() => handleClick(item.id)}
                    className={`
                      w-full text-left py-1.5 px-2 rounded transition-colors duration-150
                      ${isActive
                        ? 'text-blue-700 bg-blue-50 font-semibold'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50'
                      }
                      ${isSubItem ? 'text-sm' : 'text-sm font-medium'}
                    `}
                  >
                    <span className={`inline-block mr-1.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      {item.number}.
                    </span>
                    {item.text}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </div>
  );
}
