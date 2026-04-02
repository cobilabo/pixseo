import { Lang } from '@/types/lang';
import { MenuSettings, NavigationItem } from '@/types/theme';
import { t } from '@/lib/i18n/translations';
import { getNavigationItemUrl } from '@/lib/navigation-url';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  isHiddenFromLists?: boolean;
}

interface FurattoFooterProps {
  siteInfo: {
    name: string;
    description?: string;
  };
  menuSettings?: MenuSettings;
  categories: CategoryItem[];
  lang: Lang;
  footerBackgroundColor?: string;
}

const getItemLabel = (item: NavigationItem, lang: Lang): string => {
  const langKey = `label_${lang}` as keyof NavigationItem;
  return (item[langKey] as string) || item.label || '';
};

export default function FurattoFooter({
  siteInfo,
  menuSettings,
  categories,
  lang,
  footerBackgroundColor,
}: FurattoFooterProps) {
  const navigationItems = menuSettings?.navigationItems || [];
  const hasNavigationItems = navigationItems.length > 0;
  const visibleCategories = categories.filter(cat => !cat.isHiddenFromLists).slice(0, 10);

  return (
    <footer style={{ backgroundColor: footerBackgroundColor }} className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-3">{siteInfo.name}</h3>
            {siteInfo.description && (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{siteInfo.description}</p>
            )}
          </div>
          <div className="text-right">
            <h4 className="text-sm font-semibold mb-3 text-gray-200">{t('common.menu', lang)}</h4>
            <ul className="space-y-2">
              {hasNavigationItems ? (
                navigationItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={getNavigationItemUrl(item, lang)}
                      className="text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      {getItemLabel(item, lang)}
                    </a>
                  </li>
                ))
              ) : (
                (menuSettings?.globalNavItems || []).map((item) => (
                  <li key={item.id}>
                    <a
                      href={getNavigationItemUrl(item, lang)}
                      className="text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      {getItemLabel(item, lang)}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="text-right">
            <h4 className="text-sm font-semibold mb-3 text-gray-200">{t('nav.categories', lang)}</h4>
            <ul className="space-y-2">
              {visibleCategories.map(cat => (
                <li key={cat.id}>
                  <a href={`/${lang}/categories/${cat.slug}`} className="text-sm text-gray-300 hover:text-white transition-colors">
                    {cat.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-600 mt-8 pt-6">
          <p className="text-gray-400 text-xs text-center">
            © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
