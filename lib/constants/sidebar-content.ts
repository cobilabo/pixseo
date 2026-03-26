import type { SideContentItem } from '@/types/theme';

/** テーマの最大表示件数（20）に合わせてサーバー取得する件数 */
export const SIDEBAR_ARTICLE_FETCH_LIMIT = 20;

/** サイドバー記事ウィジェットの表示件数（2カラムのため偶数のみ） */
export const SIDE_CONTENT_DISPLAY_COUNT_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] as const;

export const DEFAULT_SIDE_CONTENT_DISPLAY_COUNT = 10;

/** 2〜20 の範囲で偶数に揃える */
export function normalizeSideContentDisplayCount(n?: number): number {
  const min = 2;
  const max = 20;
  let x = n ?? DEFAULT_SIDE_CONTENT_DISPLAY_COUNT;
  if (x < min) x = min;
  if (x > max) x = max;
  return x % 2 === 0 ? x : x + 1;
}

export function normalizeSideContentItemsDisplayCounts(
  items: SideContentItem[] | undefined
): SideContentItem[] | undefined {
  if (!items?.length) return items;
  return items.map((item) => {
    if (
      item.type === 'recentArticles' ||
      item.type === 'popularArticles' ||
      item.type === 'recommendedArticles'
    ) {
      return {
        ...item,
        displayCount: normalizeSideContentDisplayCount(item.displayCount),
      };
    }
    return item;
  });
}
