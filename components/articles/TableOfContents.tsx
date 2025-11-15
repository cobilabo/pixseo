'use client';

import { TableOfContentsItem } from '@/types/article';
import { useState, useEffect } from 'react';

interface TableOfContentsProps {
  items: TableOfContentsItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

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
    <div className="bg-white rounded-xl shadow-md border-l-3 border-blue-600 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg p-2">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">目次</h2>
      </div>
      <nav>
        <ul className="space-y-0.5">
          {items.map((item, index) => {
            // 各アイテムの安全チェック
            if (!item || !item.id || !item.text) {
              return null;
            }
            
            const isActive = activeId === item.id;
            const levelStyles = {
              2: 'ml-0 text-sm font-semibold',
              3: 'ml-4 text-xs font-medium',
              4: 'ml-8 text-xs font-normal',
            };
            
            return (
              <li
                key={item.id || `toc-${index}`}
                className={levelStyles[item.level as keyof typeof levelStyles] || 'ml-0'}
              >
                <button
                  onClick={() => handleClick(item.id)}
                  className={`
                    w-full text-left py-1.5 px-3 rounded-md transition-all duration-150 flex items-center gap-2 group
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                    }
                  `}
                >
                  <span className={`
                    w-1 h-1 rounded-full transition-all duration-150 flex-shrink-0
                    ${isActive ? 'bg-blue-600' : 'bg-gray-400 group-hover:bg-blue-500'}
                  `} />
                  <span className="flex-1 leading-snug">
                    {item.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

