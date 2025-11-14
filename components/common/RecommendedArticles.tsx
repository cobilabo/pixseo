import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types/article';

interface RecommendedArticlesProps {
  articles: Article[];
}

export default function RecommendedArticles({ articles }: RecommendedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
        おすすめ記事
      </h3>
      <div className="space-y-4">
        {articles.slice(0, 5).map((article) => (
          <Link
            key={article.id}
            href={`/media/articles/${article.slug}`}
            className="flex gap-3 hover:opacity-70 transition-opacity group"
          >
            {article.featuredImage && (
              <div className="relative w-20 h-20 flex-shrink-0 rounded overflow-hidden">
                <Image
                  src={article.featuredImage}
                  alt={article.featuredImageAlt || article.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {article.title}
              </h4>
              {article.publishedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(article.publishedAt).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

