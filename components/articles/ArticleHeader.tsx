import Image from 'next/image';
import { Article } from '@/types/article';
import { formatDate } from '@/lib/utils/date';

interface ArticleHeaderProps {
  article: Article;
}

export default function ArticleHeader({ article }: ArticleHeaderProps) {
  return (
    <header className="mb-8">
      {article.featuredImage && (
        <div className="relative w-full h-64 md:h-96 bg-gray-200 rounded-lg mb-6 overflow-hidden">
          <Image
            src={article.featuredImage}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
            priority
          />
        </div>
      )}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        {article.title}
      </h1>
      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
        <span>{formatDate(article.publishedAt)}</span>
        <span>•</span>
        <span>{article.authorName || '匿名'}</span>
        <span>•</span>
        <span>{article.viewCount || 0} views</span>
      </div>
      {article.excerpt && typeof article.excerpt === 'string' && (
        <p className="text-lg text-gray-700 leading-relaxed">{article.excerpt}</p>
      )}
    </header>
  );
}


