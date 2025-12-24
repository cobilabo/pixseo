'use client';

import { useState, useRef, useEffect } from 'react';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface TagSearchDropdownProps {
  tags: Tag[];
  onSelect: (tagId: string, tagName: string) => void;
  disabled?: boolean;
  lang?: Lang;
  isCompact?: boolean;
}

export default function TagSearchDropdown({
  tags,
  onSelect,
  disabled = false,
  lang = 'ja',
  isCompact = false
}: TagSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // クリック外で閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tag: Tag) => {
    setSelectedTag(tag);
    setIsOpen(false);
    onSelect(tag.slug, tag.name);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className={`block font-medium text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
        {t('search.tagSearch', lang)}
      </label>
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-3'
        }`}
      >
        <span className={selectedTag ? 'text-gray-900' : 'text-gray-500'}>
          {selectedTag ? selectedTag.name : t('search.selectTag', lang)}
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

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {tags.length === 0 ? (
            <div className={`text-gray-500 text-center ${isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-3'}`}>
              {t('search.noTags', lang)}
            </div>
          ) : (
            <ul>
              {tags.map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(tag)}
                    className={`w-full text-left hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                      selectedTag?.id === tag.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    } ${isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'}`}
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>{tag.name}</span>
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

