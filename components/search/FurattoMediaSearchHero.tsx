'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  isHiddenFromLists?: boolean;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

interface FurattoMediaSearchHeroProps {
  lang: Lang;
  tags?: TagItem[];
  categories?: CategoryItem[];
}

export default function FurattoMediaSearchHero({
  lang,
  tags = [],
  categories = [],
}: FurattoMediaSearchHeroProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [selectedCat, setSelectedCat] = useState<CategoryItem | null>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  const visibleCategories = categories.filter(cat => !cat.isHiddenFromLists);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagRef.current && !tagRef.current.contains(event.target as Node)) {
        setIsTagOpen(false);
      }
      if (catRef.current && !catRef.current.contains(event.target as Node)) {
        setIsCatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeywordSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    router.push(`/${lang}/search?q=${encodeURIComponent(keyword.trim())}`);
  };

  const handleTagSelect = (tag: TagItem) => {
    setSelectedTag(tag);
    setIsTagOpen(false);
    router.push(`/${lang}/search?tag=${encodeURIComponent(tag.name)}`);
  };

  const handleCatSelect = (cat: CategoryItem) => {
    setSelectedCat(cat);
    setIsCatOpen(false);
    router.push(`/${lang}/categories/${cat.slug}`);
  };

  return (
    <section className="furatto-media-search-hero relative overflow-hidden">
      {/* グラデーション背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300" />

      {/* すかしテキスト KEYWORD */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <span className="furatto-media-search-watermark text-white/[0.08] font-black tracking-widest whitespace-nowrap">
          KEYWORD
        </span>
      </div>

      {/* コンテンツ */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* キーワード検索 */}
        <form onSubmit={handleKeywordSearch} className="mb-6">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('search.keywordPlaceholder', lang)}
              className="w-full pl-5 pr-14 py-4 text-base md:text-lg rounded-full border-0 shadow-lg bg-white/95 backdrop-blur-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-white/40 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 shadow-md transition-colors"
              aria-label={t('common.search', lang)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* タグ検索 + カテゴリー検索 */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
          {/* タグ検索 */}
          {tags.length > 0 && (
            <div ref={tagRef} className="relative flex-1">
              <button
                type="button"
                onClick={() => { setIsTagOpen(!isTagOpen); setIsCatOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm text-sm shadow-md hover:bg-white transition-all"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className={selectedTag ? 'text-gray-800' : 'text-gray-500'}>
                    {selectedTag ? selectedTag.name : t('search.tagSearch', lang)}
                  </span>
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isTagOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isTagOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  <ul>
                    {tags.map((tag) => (
                      <li key={tag.id}>
                        <button
                          type="button"
                          onClick={() => handleTagSelect(tag)}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors flex items-center gap-2 ${
                            selectedTag?.id === tag.id ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span>{tag.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* カテゴリー検索 */}
          {visibleCategories.length > 0 && (
            <div ref={catRef} className="relative flex-1">
              <button
                type="button"
                onClick={() => { setIsCatOpen(!isCatOpen); setIsTagOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm text-sm shadow-md hover:bg-white transition-all"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className={selectedCat ? 'text-gray-800' : 'text-gray-500'}>
                    {selectedCat ? selectedCat.name : t('search.categorySearch', lang)}
                  </span>
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isCatOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isCatOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  <ul>
                    {visibleCategories.map((cat) => (
                      <li key={cat.id}>
                        <button
                          type="button"
                          onClick={() => handleCatSelect(cat)}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors flex items-center gap-2 ${
                            selectedCat?.id === cat.id ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span>{cat.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
