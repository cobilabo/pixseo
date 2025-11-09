import Link from 'next/link';
import { Category, Tag } from '@/types/article';

interface CategoryTagBadgesProps {
  categories: Category[];
  tags: Tag[];
}

export default function CategoryTagBadges({ categories, tags }: CategoryTagBadgesProps) {
  if (categories.length === 0 && tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {/* カテゴリーバッジ */}
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categories/${category.slug}`}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
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
          href={`/tags/${tag.slug}`}
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

