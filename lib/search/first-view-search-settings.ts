import {
  FirstViewSearchSettings,
  FirstViewSearchTypeKey,
  SearchSettings,
} from '@/types/theme';

export const FIRST_VIEW_SEARCH_ORDER: FirstViewSearchTypeKey[] = [
  'tagSearch',
  'featuredTags',
  'popularTags',
  'popularKeywords',
];

export const DEFAULT_FIRST_VIEW_SEARCH_SETTINGS: FirstViewSearchSettings = {
  searchTypes: {
    tagSearch: true,
    featuredTags: true,
    popularTags: true,
    popularKeywords: false,
  },
  searchOrder: ['featuredTags', 'popularTags', 'tagSearch', 'popularKeywords'],
};

export function normalizeFirstViewSearchOrder(
  saved: FirstViewSearchTypeKey[] | undefined
): FirstViewSearchTypeKey[] {
  if (saved && saved.length > 0) {
    const missing = FIRST_VIEW_SEARCH_ORDER.filter((k) => !saved.includes(k));
    return [...saved, ...missing];
  }
  return [...DEFAULT_FIRST_VIEW_SEARCH_SETTINGS.searchOrder!];
}

export function buildFirstViewWidgetSearchSettings(
  base: SearchSettings | undefined
): SearchSettings | undefined {
  if (!base) return undefined;

  const fv = {
    ...DEFAULT_FIRST_VIEW_SEARCH_SETTINGS,
    ...base.firstViewSearchSettings,
    searchTypes: {
      ...DEFAULT_FIRST_VIEW_SEARCH_SETTINGS.searchTypes,
      ...base.firstViewSearchSettings?.searchTypes,
    },
  };

  const order = normalizeFirstViewSearchOrder(fv.searchOrder);

  return {
    ...base,
    searchTypes: {
      keywordSearch: false,
      categorySearch: false,
      tagSearch: fv.searchTypes.tagSearch ?? false,
      featuredTags: fv.searchTypes.featuredTags ?? false,
      popularTags: fv.searchTypes.popularTags ?? false,
      popularKeywords: fv.searchTypes.popularKeywords ?? false,
    },
    searchOrder: order,
  };
}

export function hasFirstViewSearchExtras(settings: SearchSettings | undefined): boolean {
  const built = buildFirstViewWidgetSearchSettings(settings);
  if (!built?.searchTypes) return false;
  const t = built.searchTypes;
  return !!(t.tagSearch || t.featuredTags || t.popularTags || t.popularKeywords);
}