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

interface PopularKeyword {
  value: string;
  displayName?: string;
  count: number;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  isHiddenFromLists?: boolean;
}

interface SearchWidgetProps {
  searchSettings?: SearchSettings;
  mediaId?: string;
  lang?: Lang;
  tags?: Array<{ id: string; name: string; slug: string }>;
  categories?: CategoryItem[];
  featuredTags?: Array<{ id: string; name: string; slug: string }>;
  popularTags?: PopularTag[];
  popularKeywords?: PopularKeyword[];
  variant?: 'default' | 'compact' | 'hero';
  showTitle?: boolean;
  omitTypes?: SearchTypeKey[];
  /** 縺翫☆縺吶ａ繧ｿ繧ｰ繧剃ｺｺ豌励ち繧ｰ縺ｮ逶ｴ蜑阪↓蝗ｺ螳夲ｼ医Γ繝・ぅ繧｢FV逕ｨ・・*/
  featuredBeforePopular?: boolean;
}

const DEFAULT_SEARCH_ORDER: SearchTypeKey[] = [
  'keywordSearch',
  'tagSearch',
  'categorySearch',
  'featuredTags',
  'popularTags',
  'popularKeywords',
];

function applyFeaturedBeforePopular(order: SearchTypeKey[]): SearchTypeKey[] {
  const ftIdx = order.indexOf('featuredTags');
  const ptIdx = order.indexOf('popularTags');
  if (ftIdx === -1 || ptIdx === -1 || ftIdx < ptIdx) return order;
  const next: SearchTypeKey[] = order.filter((k) => k !== 'featuredTags');
  const insertAt = next.indexOf('popularTags');
  next.splice(insertAt, 0, 'featuredTags');
  return next;
}

export default function SearchWidget({
  searchSettings,
  mediaId,
  lang = 'ja',
  tags = [],
  categories = [],
  featuredTags = [],
  popularTags = [],
  popularKeywords = [],
  variant = 'default',
  showTitle = true,
  omitTypes = [],
  featuredBeforePopular = false,
}: SearchWidgetProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleCategories = categories.filter((cat) => !cat.isHiddenFromLists);
  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  const getSearchTypes = () => {
    if (searchSettings?.searchTypes) {
      return {
        keywordSearch: searchSettings.searchTypes.keywordSearch ?? false,
        tagSearch: searchSettings.searchTypes.tagSearch ?? false,
        categorySearch: searchSettings.searchTypes.categorySearch ?? false,
        featuredTags: searchSettings.searchTypes.featuredTags ?? false,
        popularTags: searchSettings.searchTypes.popularTags ?? false,
        popularKeywords: searchSettings.searchTypes.popularKeywords ?? false,
      };
    }
    const oldType = searchSettings?.searchBoxType || 'keyword';
    return {
      keywordSearch: oldType === 'keyword' || oldType === 'both',
      tagSearch: oldType === 'tag' || oldType === 'both',
      categorySearch: false,
      featuredTags: false,
      popularTags: false,
      popularKeywords: false,
    };
  };

  const searchTypes = getSearchTypes();
  const popularTagsCount = searchSettings?.popularTagsSettings?.displayCount || 10;
  const popularKeywordsCount = searchSettings?.popularKeywordsSettings?.displayCount || 10;
  const categoryDisplayType = searchSettings?.categorySearchDisplayType || 'dropdown';

  const searchOrder = (() => {
    const saved = searchSettings?.searchOrder;
    let order: SearchTypeKey[];
    if (saved && saved.length > 0) {
      const missing = DEFAULT_SEARCH_ORDER.filter((k) => !saved.includes(k));
      order = [...saved, ...missing];
    } else {
      order = DEFAULT_SEARCH_ORDER;
    }
    if (featuredBeforePopular) {
      order = applyFeaturedBeforePopular(order);
    }
    if (omitTypes.length > 0) {
      order = order.filter((k) => !omitTypes.includes(k));
    }
    return order;
  })();

  const handleKeywordSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setIsSubmitting(true);
    router.push(`/${lang}/search?q=${encodeURIComponent(keyword.trim())}`);
    setIsSubmitting(false);
  };

  const handleTagSearch = async (_tagId: string, tagName: string) => {
    setIsSubmitting(true);
    router.push(`/${lang}/search?tag=${encodeURIComponent(tagName)}`);
    setIsSubmitting(false);
  };

  const handleCategorySelect = (categorySlug: string) => {
    router.push(`/${lang}/categories/${categorySlug}`);
  };

  const handleTagClick = (tagName: string) => {
    setIsSubmitting(true);
    router.push(`/${lang}/search?tag=${encodeURIComponent(tagName)}`);
    setIsSubmitting(false);
  };

  const handlePopularKeywordClick = (kw: string) => {
    setIsSubmitting(true);
    router.push(`/${lang}/search?q=${encodeURIComponent(kw)}`);
    setIsSubmitting(false);
  };

  const displayPopularTags = popularTags.slice(0, popularTagsCount);
  const displayPopularKeywords = popularKeywords.slice(0, popularKeywordsCount);

  const labelClass = isHero
    ? `block font-medium text-white/90 ${isCompact ? 'text-xs mb-2' : 'text-sm mb-2'}`
    : `block font-medium text-gray-700 ${isCompact ? 'text-xs mb-2' : 'text-sm mb-2'}`;

  const featuredBtnClass = isHero
    ? `inline-flex items-center gap-1 px-3 py-1.5 bg-white/90 text-amber-800 rounded-full hover:bg-white shadow-sm transition-colors disabled:opacity-50 ${isCompact ? 'text-xs' : 'text-sm'}`
    : `inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-full hover:bg-amber-100 transition-colors disabled:opacity-50 ${isCompact ? 'text-xs' : 'text-sm'}`;

  const popularTagBtnClass = isHero
    ? `inline-flex items-center gap-1 px-3 py-1.5 bg-white/85 text-orange-800 rounded-full hover:bg-white shadow-sm transition-colors disabled:opacity-50 ${isCompact ? 'text-xs' : 'text-sm'}`
    : `inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors disabled:opacity-50 ${isCompact ? 'text-xs' : 'text-sm'}`;

  const popularKwBtnClass = isHero
    ? `inline-flex items-center gap-1 px-3 py-1.5 bg-white/85 text-rose-800 rounded-full hover:bg-white shadow-sm transition-colors disabled:opacity-50 ${isCompact ? 'text-xs' : 'text-sm'}`
    : `inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full hover:bg-rose-100 transition-colors disabled:opacity-50 ${isCompact ? 'text-xs' : 'text-sm'}`;

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
                className={`w-full border-none bg-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-black ${
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
            isCompact={isCompact || isHero}
          />
        );

      case 'categorySearch':
        if (!searchTypes.categorySearch || visibleCategories.length === 0) return null;
        if (categoryDisplayType === 'list') {
          return (
            <div key={key}>
              <div className="flex flex-wrap gap-2">
                {visibleCategories.map((cat) => (
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
            categories={visibleCategories}
            onSelect={handleCategorySelect}
            isCompact={isCompact || isHero}
          />
        );

      case 'featuredTags':
        if (!searchTypes.featuredTags || featuredTags.length === 0) return null;
        return (
          <div key={key}>
            <label className={labelClass}>{t('search.featuredTags', lang)}</label>
            <div className="flex flex-wrap gap-2">
              {featuredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagClick(tag.name)}
                  disabled={isSubmitting}
                  className={featuredBtnClass}
                >
                  <span className="text-amber-500">⭐</span>
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'popularTags':
        if (!searchTypes.popularTags || displayPopularTags.length === 0) return null;
        return (
          <div key={key}>
            <label className={labelClass}>{t('search.popularTags', lang)}</label>
            <div className="flex flex-wrap gap-2">
              {displayPopularTags.map((tag, index) => (
                <button
                  key={`${tag.value}-${index}`}
                  type="button"
                  onClick={() => handleTagClick(tag.displayName || tag.value)}
                  disabled={isSubmitting}
                  className={popularTagBtnClass}
                >
                  <span className="text-orange-500">櫨</span>
                  <span>{tag.displayName || tag.value}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'popularKeywords':
        if (!searchTypes.popularKeywords || displayPopularKeywords.length === 0) return null;
        return (
          <div key={key}>
            <label className={labelClass}>{t('search.popularKeywords', lang)}</label>
            <div className="flex flex-wrap gap-2">
              {displayPopularKeywords.map((kw, index) => (
                <button
                  key={`${kw.value}-${index}`}
                  type="button"
                  onClick={() => handlePopularKeywordClick(kw.displayName || kw.value)}
                  disabled={isSubmitting}
                  className={popularKwBtnClass}
                >
                  <span className="text-rose-500">剥</span>
                  <span>{kw.displayName || kw.value}</span>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const items = searchOrder.map(renderSearchItem).filter(Boolean);
  if (items.length === 0) return null;

  const wrapperClass = isHero
    ? ''
    : `bg-white rounded-lg shadow-md ${isCompact ? 'p-4' : 'p-6'}`;

  return (
    <div className={wrapperClass}>
      {showTitle && !isHero && (
        <h3 className={`font-bold text-gray-900 text-lg ${isCompact ? 'mb-3' : 'mb-4'}`}>
          {t('common.search', lang)}
        </h3>
      )}

      <div className="space-y-4">{items}</div>
    </div>
  );
}

