import Link from 'next/link';
import Image from 'next/image';
import { Article, Category } from '@/types/article';

interface ArticleNavigationProps {
  previousArticle?: Article | null;
  nextArticle?: Article | null;
  previousCategories?: Category[];
  nextCategories?: Category[];
  logoUrl?: string;
}

export default function ArticleNavigation({ 
  previousArticle, 
  nextArticle,
  previousCategories = [],
  nextCategories = [],
  logoUrl
}: ArticleNavigationProps) {
  if (!previousArticle && !nextArticle) {
    return null;
  }

  const formatDate = (date: Date | any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date.toDate?.() || date);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
  };

  return (
    <nav className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 次の記事 */}
        <div>
          {nextArticle ? (
            <Link
              href={`/articles/${nextArticle.slug}`}
              className="block group bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-5"
            >
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">次の記事</span>
              </div>
              
              <h3 className="text-base font-bold transition-colors line-clamp-2 mb-3" style={{ color: 'var(--link-text-color, #1f2937)' }}>
                <span className="group-hover:hidden">{nextArticle.title}</span>
                <span className="hidden group-hover:inline" style={{ color: 'var(--link-hover-color, #2563eb)' }}>
                  {nextArticle.title}
                </span>
              </h3>
              
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span>公開: {formatDate(nextArticle.publishedAt)}</span>
                  {nextArticle.updatedAt && (
                    <span>• 更新: {formatDate(nextArticle.updatedAt)}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {nextArticle.viewCount !== undefined && (
                    <span>{nextArticle.viewCount.toLocaleString()} views</span>
                  )}
                  {nextCategories.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {nextCategories.slice(0, 2).map((cat) => (
                          <span 
                            key={cat.id} 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: 'color-mix(in srgb, var(--primary-color, #3b82f6) 15%, white)',
                              color: 'var(--primary-color, #3b82f6)'
                            }}
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-5 flex flex-col items-center justify-center text-gray-900 text-sm h-full" style={{ minHeight: '160px' }}>
              {logoUrl ? (
                <div className="relative w-16 h-16 mb-3 opacity-30">
                  <Image
                    src={logoUrl}
                    alt="Site Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              次の記事はありません
            </div>
          )}
        </div>

        {/* 前の記事 */}
        <div>
          {previousArticle ? (
            <Link
              href={`/articles/${previousArticle.slug}`}
              className="block group bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-5"
            >
              <div className="flex items-center justify-end text-sm text-gray-600 mb-3">
                <span className="font-medium">前の記事</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              
              <h3 className="text-base font-bold transition-colors line-clamp-2 mb-3 text-right" style={{ color: 'var(--link-text-color, #1f2937)' }}>
                <span className="group-hover:hidden">{previousArticle.title}</span>
                <span className="hidden group-hover:inline" style={{ color: 'var(--link-hover-color, #2563eb)' }}>
                  {previousArticle.title}
                </span>
              </h3>
              
              <div className="space-y-1.5 text-xs text-gray-600 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span>公開: {formatDate(previousArticle.publishedAt)}</span>
                  {previousArticle.updatedAt && (
                    <span>• 更新: {formatDate(previousArticle.updatedAt)}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-end gap-2">
                  {previousArticle.viewCount !== undefined && (
                    <span>{previousArticle.viewCount.toLocaleString()} views</span>
                  )}
                  {previousCategories.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {previousCategories.slice(0, 2).map((cat) => (
                          <span 
                            key={cat.id} 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: 'color-mix(in srgb, var(--primary-color, #3b82f6) 15%, white)',
                              color: 'var(--primary-color, #3b82f6)'
                            }}
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-5 flex flex-col items-center justify-center text-gray-900 text-sm h-full" style={{ minHeight: '160px' }}>
              {logoUrl ? (
                <div className="relative w-16 h-16 mb-3 opacity-30">
                  <Image
                    src={logoUrl}
                    alt="Site Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              前の記事はありません
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

