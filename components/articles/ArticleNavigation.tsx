import Link from 'next/link';
import { Article } from '@/types/article';

interface ArticleNavigationProps {
  previousArticle?: Article | null;
  nextArticle?: Article | null;
}

export default function ArticleNavigation({ previousArticle, nextArticle }: ArticleNavigationProps) {
  if (!previousArticle && !nextArticle) {
    return null;
  }

  return (
    <nav className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 前の記事 */}
        <div>
          {previousArticle ? (
            <Link
              href={`/articles/${previousArticle.slug}`}
              className="block group"
            >
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                前の記事
              </div>
              <div className="text-gray-900 font-medium group-hover:text-blue-600 transition-colors line-clamp-2">
                {previousArticle.title}
              </div>
            </Link>
          ) : (
            <div className="text-gray-400 text-sm">前の記事はありません</div>
          )}
        </div>

        {/* 次の記事 */}
        <div className="text-right">
          {nextArticle ? (
            <Link
              href={`/articles/${nextArticle.slug}`}
              className="block group"
            >
              <div className="flex items-center justify-end text-sm text-gray-600 mb-2">
                次の記事
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="text-gray-900 font-medium group-hover:text-blue-600 transition-colors line-clamp-2">
                {nextArticle.title}
              </div>
            </Link>
          ) : (
            <div className="text-gray-400 text-sm">次の記事はありません</div>
          )}
        </div>
      </div>
    </nav>
  );
}

