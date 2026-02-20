'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchSettings, SearchTypeKey } from '@/types/theme';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import TagSearchDropdown from './TagSearchDropdown';
import CategorySearchDropdown from './CategorySearchDropdown';

interface PopularTag {
  value: string;
  displayName?: string;
  count: number;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface SearchWidgetProps {
  searchSettings?: SearchSettings;
  mediaId?: string;
  lang?: Lang;
  tags?: Array<{ id: string; name: string; slug: string }>;
  categories?: CategoryItem[];
  popularTags?: PopularTag[];
  variant?: 'default' | 'compact';
}

const DEFAULT_SEARCH_ORDER: SearchTypeKey[] = ['keywordSearch', 'tagSearch', 'categorySearch', 'popularTags'];

export default function SearchWidget({ 
  searchSettings, 
  mediaId, 
  lang = 'ja',
  tags = [],
  categories = [],
  popularTags = [],
  variant = 'default'
}: SearchWidgetProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSearchTypes = () => {
    if (searchSettings?.searchTypes) {
      return searchSettings.searchTypes;
    }
    const oldType = searchSettings?.searchBoxType || 'keyword';
    return {
      keywordSearch: oldType === 'keyword' || oldType === 'both',
      tagSearch: oldType === 'tag' || oldType === 'both',
      categorySearch: false,
      popularTags: false,
    };
  };

  const searchTypes = getSearchTypes();
  const popularTagsCount = searchSettings?.popularTagsSettings?.displayCount || 10;
  const categoryDisplayType = searchSettings?.categorySearchDisplayType || 'dropdown';

  const searchOrder = (() => {
    const saved = searchSettings?.searchOrder;
    if (saved && saved.length > 0) {
      const missing = DEFAULT_SEARCH_ORDER.filter(k => !saved.includes(k));
      return [...saved, ...missing];
    }
    return DEFAULT_SEARCH_ORDER;
  })();

  const handleKeywordSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setIsSubmitting(true);
    router.push(`/${lang}/search?q=${encodeURIComponent(keyword.trim())}`);
    setIsSubmitting(false);
  };

  const handleTagSearch = async (tagId: string, tagName: string) => {
    setIsSubmitting(true);
    router.push(`/${lang}/search?tag=${encodeURIComponent(tagName)}`);
    setIsSubmitting(false);
  };

  const handleCategorySelect = (categorySlug: string) => {
    router.push(`/${lang}/categories/${categorySlug}`);
  };

  const handlePopularTagClick = (tagName: string) => {
    setIsSubmitting(true);
    router.push(`/${lang}/search?tag=${encodeURIComponent(tagName)}`);
    setIsSubmitting(false);
  };

  const isCompact = variant === 'compact';
  const displayPopularTags = popularTags.slice(0, popularTagsCount);

  const renderSearchItem = (key: SearchTypeKey) => {
    switch (key) {
      case 'keywordSearch':
        if (!searchTypes.keywordSearch) return null;
        return (
          <form key={key} onSubmit={handleKeywordSearch}>
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('search.keywordPlaceholder', lang)}
                className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black ${
                  isCompact ? 'pl-3 pr-10 py-2 text-sm' : 'pl-4 pr-12 py-3'
                }`}
              />
              <button
                type="submit"
                disabled={isSubmitting || !keyword.trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 disabled:text-gray-300 transition-colors ${
                  isCompact ? 'p-1' : 'p-1.5'
                }`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                ) : (
                  <svg className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        );

      case 'tagSearch':
        if (!searchTypes.tagSearch || tags.length === 0) return null;
        return (
          <TagSearchDropdown
            key={key}
            tags={tags}
            onSelect={handleTagSearch}
            disabled={isSubmitting}
            lang={lang}
            isCompact={isCompact}
          />
        );

      case 'categorySearch':
        if (!searchTypes.categorySearch || categories.length === 0) return null;
        if (categoryDisplayType === 'list') {
          return (
            <div key={key}>
              <label className={`block font-medium text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
                カテゴリーから探す
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors ${
                      isCompact ? 'text-xs' : 'text-sm'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        }
        return (
          <CategorySearchDropdown
            key={key}
            categories={categories}
            onSelect={handleCategorySelect}
            isCompact={isCompact}
          />
        );

      case 'popularTags':
        if (!searchTypes.popularTags || displayPopularTags.length === 0) return null;
        return (
          <div key={key}>
            <label className={`block font-medium text-gray-700 ${isCompact ? 'text-xs mb-2' : 'text-sm mb-2'}`}>
              {t('search.popularTags', lang)}
            </label>
            <div className="flex flex-wrap gap-2">
              {displayPopularTags.map((tag, index) => (
                <button
                  key={`${tag.value}-${index}`}
                  onClick={() => handlePopularTagClick(tag.displayName || tag.value)}
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors disabled:opacity-50 ${
                    isCompact ? 'text-xs' : 'text-sm'
                  }`}
                >
                  <span className="text-orange-500">🔥</span>
                  <span>{tag.displayName || tag.value}</span>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${isCompact ? 'p-4' : 'p-6'}`}>
      <h3 className={`font-bold text-gray-900 ${isCompact ? 'text-sm mb-3' : 'text-lg mb-4'}`}>
        {t('common.search', lang)}
      </h3>

      <div className="space-y-4">
        {searchOrder.map(renderSearchItem)}
      </div>
    </div>
  );
}
