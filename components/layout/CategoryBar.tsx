import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types/article';
import { Lang } from '@/types/lang';
import { NavigationItem, GlobalMenuDesign, GlobalMenuHeight, GlobalMenuHoverEffect } from '@/types/theme';

const DEFAULT_DESIGN: GlobalMenuDesign = {
  height: 'medium',
  borderRadius: 24,
  overlayOpacity: 70,
  defaultGradientFrom: '#3b82f6',
  defaultGradientTo: '#9333ea',
  labelColor: '#ffffff',
  labelFontSize: '18',
  labelFontWeight: 'bold',
  hoverEffect: 'grayscale',
  gap: 0,
  showInitialChar: true,
};

const HEIGHT_MAP: Record<GlobalMenuHeight, string> = {
  small: '120px',
  medium: '192px',
  large: '384px',
};

interface CategoryBarProps {
  categories: Category[];
  excludeCategoryId?: string;
  variant?: 'full' | 'half';
  lang?: Lang;
  globalNavItems?: NavigationItem[];
  globalMenuDesign?: GlobalMenuDesign;
}

const getNavItemUrl = (item: NavigationItem, lang: Lang): string => {
  switch (item.type) {
    case 'top':
      return `/${lang}`;
    case 'search':
      return `/${lang}/search`;
    case 'page':
      return item.pageSlug ? `/${lang}/${item.pageSlug}` : `/${lang}`;
    case 'category':
      return item.categorySlug ? `/${lang}/categories/${item.categorySlug}` : `/${lang}`;
    default:
      return `/${lang}`;
  }
};

const getNavItemLabel = (item: NavigationItem, lang: Lang): string => {
  const langKey = `label_${lang}` as keyof NavigationItem;
  return (item[langKey] as string) || item.label || '';
};

const getHoverClasses = (effect: GlobalMenuHoverEffect): { image: string; bg: string } => {
  switch (effect) {
    case 'grayscale':
      return { image: 'group-hover:grayscale group-hover:scale-110', bg: 'group-hover:grayscale' };
    case 'darken':
      return { image: 'group-hover:brightness-50', bg: 'group-hover:brightness-50' };
    case 'zoom':
      return { image: 'group-hover:scale-125', bg: 'group-hover:scale-110' };
    case 'none':
      return { image: '', bg: '' };
  }
};

export default function CategoryBar({ categories, excludeCategoryId, variant = 'half', lang = 'ja', globalNavItems = [], globalMenuDesign }: CategoryBarProps) {
  const d = { ...DEFAULT_DESIGN, ...globalMenuDesign };
  const hoverClasses = getHoverClasses(d.hoverEffect);
  const itemHeight = HEIGHT_MAP[d.height];
  const overlayFrom = Math.round(d.overlayOpacity / 100 * 255).toString(16).padStart(2, '0');
  const overlayVia = Math.round(d.overlayOpacity / 100 * 0.43 * 255).toString(16).padStart(2, '0');
  const fontWeightMap: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };

  if (globalNavItems.length > 0) {
    return (
      <section className="relative z-20 pt-12 pb-8 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden" style={{ borderRadius: `${d.borderRadius}px` }}>
            <div className="flex overflow-x-auto scrollbar-hide" style={{ gap: `${d.gap}px` }}>
              {globalNavItems.map((item) => {
                const label = getNavItemLabel(item, lang);
                const url = getNavItemUrl(item, lang);
                const matchedCategory = item.type === 'category' && item.categoryId
                  ? categories.find(cat => cat.id === item.categoryId)
                  : null;

                return (
                  <Link
                    key={item.id}
                    href={url}
                    className="relative flex-1 min-w-[150px] group overflow-hidden"
                    style={{ height: itemHeight }}
                  >
                    {matchedCategory?.imageUrl ? (
                      <>
                        <div className="absolute inset-0 overflow-hidden">
                          <Image
                            src={matchedCategory.imageUrl}
                            alt={matchedCategory.imageAlt || label}
                            fill
                            className={`object-cover transition-all duration-300 ${hoverClasses.image}`}
                            sizes="(max-width: 768px) 150px, 200px"
                          />
                        </div>
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(to top, #000000${overlayFrom}, #000000${overlayVia}, transparent)`,
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <div
                          className={`absolute inset-0 transition-all duration-300 ${hoverClasses.bg}`}
                          style={{
                            background: `linear-gradient(to bottom right, ${d.defaultGradientFrom}, ${d.defaultGradientTo})`,
                          }}
                        />
                        {d.showInitialChar && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl font-bold text-white/30">
                              {label.charAt(0)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <span
                        className="text-center drop-shadow-lg block"
                        style={{
                          color: d.labelColor,
                          fontSize: `${d.labelFontSize}px`,
                          fontWeight: fontWeightMap[d.labelFontWeight] || 700,
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const filteredCategories = excludeCategoryId
    ? categories.filter(cat => cat.id !== excludeCategoryId)
    : categories;

  if (filteredCategories.length === 0) {
    return null;
  }

  return (
    <section className="relative z-20 pt-12 pb-8 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden" style={{ borderRadius: `${d.borderRadius}px` }}>
          <div className="flex overflow-x-auto scrollbar-hide" style={{ gap: `${d.gap}px` }}>
            {filteredCategories.map((category) => (
              <Link
                key={category.id}
                href={`/${lang}/categories/${category.slug}`}
                className="relative flex-1 min-w-[150px] group overflow-hidden"
                style={{ height: itemHeight }}
              >
                {category.imageUrl ? (
                  <>
                    <div className="absolute inset-0 overflow-hidden">
                      <Image
                        src={category.imageUrl}
                        alt={category.imageAlt || category.name}
                        fill
                        className={`object-cover transition-all duration-300 ${hoverClasses.image}`}
                        sizes="(max-width: 768px) 150px, 200px"
                      />
                    </div>
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, #000000${overlayFrom}, #000000${overlayVia}, transparent)`,
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className={`absolute inset-0 transition-all duration-300 ${hoverClasses.bg}`}
                      style={{
                        background: `linear-gradient(to bottom right, ${d.defaultGradientFrom}, ${d.defaultGradientTo})`,
                      }}
                    />
                    {d.showInitialChar && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl font-bold text-white/30">
                          {category.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <span
                    className="text-center drop-shadow-lg block"
                    style={{
                      color: d.labelColor,
                      fontSize: `${d.labelFontSize}px`,
                      fontWeight: fontWeightMap[d.labelFontWeight] || 700,
                    }}
                  >
                    {category.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
