'use client';

import { Block, SearchBlockConfig } from '@/types/block';
import { SearchSettings, SearchTypeKey } from '@/types/theme';
import { Lang } from '@/types/lang';
import SearchWidget from '@/components/search/SearchWidget';

interface SearchBlockProps {
  block: Block;
  lang?: Lang;
  tags?: Array<{ id: string; name: string; slug: string }>;
  categories?: Array<{ id: string; name: string; slug: string; isHiddenFromLists?: boolean }>;
  popularTags?: Array<{ value: string; displayName?: string; count: number }>;
  popularKeywords?: Array<{ value: string; displayName?: string; count: number }>;
  mediaId?: string;
}

export default function SearchBlock({
  block,
  lang = 'ja',
  tags = [],
  categories = [],
  popularTags = [],
  popularKeywords = [],
  mediaId,
}: SearchBlockProps) {
  const config = block.config as SearchBlockConfig;

  const searchSettings: SearchSettings = {
    displayPages: {
      topPage: false,
      staticPages: true,
      articlePages: false,
      sidebar: false,
    },
    searchTypes: config.searchTypes || {
      keywordSearch: true,
      tagSearch: false,
      categorySearch: false,
      popularTags: false,
      popularKeywords: false,
    },
    searchOrder: config.searchOrder as SearchTypeKey[] | undefined,
    categorySearchDisplayType: config.categorySearchDisplayType,
    popularTagsSettings: {
      displayCount: config.popularTagsDisplayCount || 10,
    },
    popularKeywordsSettings: {
      displayCount: config.popularKeywordsDisplayCount || 10,
      aggregationDays: config.popularKeywordsAggregationDays ?? 30,
    },
  };

  return (
    <SearchWidget
      searchSettings={searchSettings}
      mediaId={mediaId}
      lang={lang}
      tags={tags}
      categories={categories}
      popularTags={popularTags}
      popularKeywords={popularKeywords}
    />
  );
}
