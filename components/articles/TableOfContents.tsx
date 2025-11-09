'use client';

import { TableOfContentsItem } from '@/types/article';
import { useState, useEffect } from 'react';

interface TableOfContentsProps {
  items: TableOfContentsItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  // 配列でない場合の安全チェック
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  useEffect(() => {
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

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-blue-50 rounded-xl p-6 mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        目次
      </h2>
      <ul className="space-y-2">
        {items.map((item, index) => {
          // 各アイテムの安全チェック
          if (!item || !item.id || !item.text) {
            return null;
          }
          
          return (
            <li
              key={item.id || `toc-${index}`}
              className={`${
                item.level === 2 ? 'ml-0' : item.level === 3 ? 'ml-4' : 'ml-8'
              }`}
            >
              <button
                onClick={() => handleClick(item.id)}
                className={`text-left hover:text-blue-600 transition-colors ${
                  activeId === item.id ? 'text-blue-600 font-semibold' : 'text-gray-700'
                }`}
              >
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

