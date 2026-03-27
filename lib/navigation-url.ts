import { Lang } from '@/types/lang';
import { NavigationItem } from '@/types/theme';

/**
 * テーマのナビゲーション項目（ハンバーガー・グローバルメニュー等）からリンクURLを生成する。
 */
export function getNavigationItemUrl(item: NavigationItem, lang: Lang): string {
  switch (item.type) {
    case 'top':
      return `/${lang}`;
    case 'search':
      return `/${lang}/search`;
    case 'page':
      if (item.pageSlug === 'home') {
        return `/${lang}`;
      }
      return item.pageSlug ? `/${lang}/${item.pageSlug}` : `/${lang}`;
    case 'category':
      return item.categorySlug
        ? `/${lang}/categories/${item.categorySlug}`
        : `/${lang}`;
    default:
      return `/${lang}`;
  }
}
