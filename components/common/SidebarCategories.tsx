import Link from 'next/link';
import { Category } from '@/types/article';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface CategoryWithCount extends Category {
  articleCount?: number;
}

interface SidebarCategoriesProps {
  categories: CategoryWithCount[];
  lang?: Lang;
}

export default function SidebarCategories({ categories, lang = 'ja' }: SidebarCategoriesProps) {
  // 記事が登録されているカテゴリーのみ表示
  const categoriesWithArticles = categories.filter(cat => (cat.articleCount || 0) > 0);

  if (categoriesWithArticles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
        {t('section.categories', lang)}
      </h2>
      <ul className="space-y-2">
        {categoriesWithArticles.map((category) => {
          const categoryName = (category as any)[`name_${lang}`] || category.name;
          
          return (
            <li key={category.id}>
              <Link
                href={`/${lang}/categories/${category.slug}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span 
                  className="text-sm font-medium transition-colors"
                  style={{ color: 'var(--link-text-color, #1f2937)' }}
                >
                  <span className="group-hover:hidden">{categoryName}</span>
                  <span className="hidden group-hover:inline" style={{ color: 'var(--link-hover-color, #2563eb)' }}>
                    {categoryName}
                  </span>
                </span>
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--primary-color, #3b82f6) 15%, white)',
                    color: 'var(--primary-color, #3b82f6)'
                  }}
                >
                  {category.articleCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
