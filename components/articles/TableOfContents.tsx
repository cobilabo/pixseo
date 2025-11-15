'use client';

import { TableOfContentsItem } from '@/types/article';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface TableOfContentsProps {
  items: TableOfContentsItem[];
  faviconUrl?: string;
}

export default function TableOfContents({ items, faviconUrl }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full mb-4 pb-3 border-b border-gray-200"
      >
        <div className="flex items-center gap-2">
          {faviconUrl ? (
            <Image
              src={faviconUrl}
              alt="アイコン"
              width={24}
              height={24}
              className="w-6 h-6"
              unoptimized={faviconUrl.endsWith('.svg')}
            />
          ) : (
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          )}
          <h2 className="text-lg font-bold text-gray-900">目次</h2>
        </div>
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
          <ul className="space-y-0.5">
            {items.map((item, index) => {
              // 各アイテムの安全チェック
              if (!item || !item.id || !item.text) {
                return null;
              }
              
              const isActive = activeId === item.id;
              const isH3 = item.level === 3;
              const levelStyles = {
                2: 'ml-0 text-sm font-semibold',
                3: 'ml-4 text-xs font-medium',
                4: 'ml-8 text-xs font-normal',
              };
              
              return (
                <li
                  key={item.id || `toc-${index}`}
                  className={`${levelStyles[item.level as keyof typeof levelStyles] || 'ml-0'} ${isH3 ? 'border-b border-gray-200 pb-2 mb-2' : ''}`}
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
      )}
    </div>
  );
}

