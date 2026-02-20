'use client';

import { useState, useRef, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategorySearchDropdownProps {
  categories: Category[];
  onSelect: (categorySlug: string) => void;
  disabled?: boolean;
  isCompact?: boolean;
}

export default function CategorySearchDropdown({
  categories,
  onSelect,
  disabled = false,
  isCompact = false,
}: CategorySearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (cat: Category) => {
    setSelectedCategory(cat);
    setIsOpen(false);
    onSelect(cat.slug);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className={`block font-medium text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
        カテゴリーから探す
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-3'
        }`}
      >
        <span className={selectedCategory ? 'text-gray-900' : 'text-gray-500'}>
          {selectedCategory ? selectedCategory.name : 'カテゴリーを選択'}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {categories.length === 0 ? (
            <div className={`text-gray-500 text-center ${isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-3'}`}>
              カテゴリーがありません
            </div>
          ) : (
            <ul>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={`w-full text-left hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                      selectedCategory?.id === cat.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    } ${isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'}`}
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>{cat.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
