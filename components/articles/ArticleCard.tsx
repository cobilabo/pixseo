import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types/article';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface ArticleCardProps {
  article: Article & { categoryNames?: string[] };
  lang?: Lang;
}

function cardFormatDate(date: Date | any): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date.toDate?.() || date);
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

export default function ArticleCard({ article, lang = 'ja' }: ArticleCardProps) {
  return (
    <Link
      href={`/${lang}/articles/${article.slug}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
    >
      {article.featuredImage && (
        <div className="relative w-full h-48 bg-gray-200">
          <Image
            src={article.featuredImage}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={85}
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        {article.categoryNames && article.categoryNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {article.categoryNames.slice(0, 2).map((name, i) => (
              <span key={i} className="article-card-category-badge px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color, #E08A3C) 15%, white)', color: 'var(--primary-color, #E08A3C)' }}>
                {name}
              </span>
            ))}
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span>{t('article.publishedAt', lang)}: {cardFormatDate(article.publishedAt)}</span>
            {article.updatedAt && (
              <>
                <span>•</span>
                <span>{t('article.updatedAt', lang)}: {cardFormatDate(article.updatedAt)}</span>
              </>
            )}
          </div>
          <span>{t('article.viewCount', lang, { count: article.viewCount || 0 })}</span>
        </div>
      </div>
    </Link>
  );
}


