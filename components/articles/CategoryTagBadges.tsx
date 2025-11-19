import Link from 'next/link';
import { Category, Tag } from '@/types/article';
import { Lang } from '@/types/lang';

interface CategoryTagBadgesProps {
  categories: Category[];
  tags: Tag[];
  lang?: Lang;
}

export default function CategoryTagBadges({ categories, tags, lang = 'ja' }: CategoryTagBadgesProps) {
  if (categories.length === 0 && tags.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
      {/* カテゴリーバッジ */}
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/${lang}/categories/${category.slug}`}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--primary-color, #3b82f6) 15%, white)',
            color: 'var(--primary-color, #3b82f6)'
          }}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {category.name}
        </Link>
      ))}

      {/* タグバッジ */}
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={`/${lang}/tags/${tag.slug}`}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          {tag.name}
        </Link>
      ))}
    </div>
  );
}

