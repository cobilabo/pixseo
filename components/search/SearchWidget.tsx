'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchSettings, SearchBoxType } from '@/types/theme';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import TagSearchDropdown from './TagSearchDropdown';

interface SearchWidgetProps {
  searchSettings?: SearchSettings;
  mediaId?: string;
  lang?: Lang;
  tags?: Array<{ id: string; name: string; slug: string }>;
  variant?: 'default' | 'compact';
}

export default function SearchWidget({ 
  searchSettings, 
  mediaId, 
  lang = 'ja',
  tags = [],
  variant = 'default'
}: SearchWidgetProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchBoxType: SearchBoxType = searchSettings?.searchBoxType || 'keyword';

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

  const isCompact = variant === 'compact';

  return (
    <div className={`bg-white rounded-lg shadow-md ${isCompact ? 'p-4' : 'p-6'}`}>
      <h3 className={`font-bold text-gray-900 ${isCompact ? 'text-sm mb-3' : 'text-lg mb-4'}`}>
        {t('common.search', lang)}
      </h3>

      <div className="space-y-4">
        {/* キーワード検索 */}
        {(searchBoxType === 'keyword' || searchBoxType === 'both') && (
          <form onSubmit={handleKeywordSearch}>
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('search.keywordPlaceholder', lang)}
                className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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

        {/* タグ検索 */}
        {(searchBoxType === 'tag' || searchBoxType === 'both') && tags.length > 0 && (
          <TagSearchDropdown
            tags={tags}
            onSelect={handleTagSearch}
            disabled={isSubmitting}
            lang={lang}
            isCompact={isCompact}
          />
        )}
      </div>
    </div>
  );
}

