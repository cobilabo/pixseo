'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchSettings } from '@/types/theme';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import TagSearchDropdown from './TagSearchDropdown';

interface PopularTag {
  value: string;
  displayName?: string;
  count: number;
}

interface SearchWidgetProps {
  searchSettings?: SearchSettings;
  mediaId?: string;
  lang?: Lang;
  tags?: Array<{ id: string; name: string; slug: string }>;
  popularTags?: PopularTag[];
  variant?: 'default' | 'compact';
}

export default function SearchWidget({ 
  searchSettings, 
  mediaId, 
  lang = 'ja',
  tags = [],
  popularTags = [],
  variant = 'default'
}: SearchWidgetProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新形式の検索タイプを取得（後方互換性対応）
  const getSearchTypes = () => {
    if (searchSettings?.searchTypes) {
      return searchSettings.searchTypes;
    }
    // 後方互換性: searchBoxType から変換
    const oldType = searchSettings?.searchBoxType || 'keyword';
    return {
      keywordSearch: oldType === 'keyword' || oldType === 'both',
      tagSearch: oldType === 'tag' || oldType === 'both',
      popularTags: false,
    };
  };

  const searchTypes = getSearchTypes();
  const popularTagsCount = searchSettings?.popularTagsSettings?.displayCount || 10;

  // キーワード検索 - 検索ページへ遷移
  const handleKeywordSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword.trim()) return;

    setIsSubmitting(true);
    
    // 検索ページへ遷移（検索ログは SearchContent で記録）
    router.push(`/${lang}/search?q=${encodeURIComponent(keyword.trim())}`);
    setIsSubmitting(false);
  };

  // タグ検索 - 検索ページへ遷移（Algolia経由で検索）
  const handleTagSearch = async (tagId: string, tagName: string) => {
    setIsSubmitting(true);
    
    // 検索ページへ遷移（タグ名パラメータで検索）
    // タグ名を使ってAlgoliaで検索する（検索ログは SearchContent で記録）
    router.push(`/${lang}/search?tag=${encodeURIComponent(tagName)}`);
    setIsSubmitting(false);
  };

  // よく検索されているタグをクリック
  const handlePopularTagClick = (tagName: string) => {
    setIsSubmitting(true);
    router.push(`/${lang}/search?tag=${encodeURIComponent(tagName)}`);
    setIsSubmitting(false);
  };

  const isCompact = variant === 'compact';

  // 表示するよく検索されているタグ
  const displayPopularTags = popularTags.slice(0, popularTagsCount);

  return (
    <div className={`bg-white rounded-lg shadow-md ${isCompact ? 'p-4' : 'p-6'}`}>
      <h3 className={`font-bold text-gray-900 ${isCompact ? 'text-sm mb-3' : 'text-lg mb-4'}`}>
        {t('common.search', lang)}
      </h3>

      <div className="space-y-4">
        {/* キーワード検索 */}
        {searchTypes.keywordSearch && (
          <form onSubmit={handleKeywordSearch}>
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
        )}

        {/* タグ検索（プルダウン） */}
        {searchTypes.tagSearch && tags.length > 0 && (
          <TagSearchDropdown
            tags={tags}
            onSelect={handleTagSearch}
            disabled={isSubmitting}
            lang={lang}
            isCompact={isCompact}
          />
        )}

        {/* よく検索されているタグ */}
        {searchTypes.popularTags && displayPopularTags.length > 0 && (
          <div>
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
        )}
      </div>
    </div>
  );
}

