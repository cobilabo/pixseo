import Image from 'next/image';
import { Article } from '@/types/article';
import { Writer } from '@/types/writer';
import { formatDate } from '@/lib/utils/date';

interface ArticleHeaderProps {
  article: Article;
  writer?: Writer | null;
}

export default function ArticleHeader({ article, writer }: ArticleHeaderProps) {
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>公開: {formatDate(article.publishedAt)}</span>
        </div>
        
        {/* 更新日が公開日と異なる場合のみ表示 */}
        {article.updatedAt && article.publishedAt &&
         new Date(article.updatedAt).getTime() !== new Date(article.publishedAt).getTime() && (
          <>
            <span>•</span>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>更新: {formatDate(article.updatedAt)}</span>
            </div>
          </>
        )}
        
        <span>•</span>
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{writer?.handleName || '匿名'}</span>
        </div>
        
        <span>•</span>
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{article.viewCount || 0} views</span>
        </div>
      </div>
      {article.excerpt && typeof article.excerpt === 'string' && (
        <p className="text-lg text-gray-700 leading-relaxed">{article.excerpt}</p>
      )}
    </header>
  );
}


