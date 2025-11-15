import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types/article';
import { Lang } from '@/types/lang';
import { formatDate } from '@/lib/utils/date';

interface ArticleCardProps {
  article: Article;
  lang?: Lang;
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDate(article.publishedAt)}</span>
          <span>{article.viewCount || 0} views</span>
        </div>
      </div>
    </Link>
  );
}


