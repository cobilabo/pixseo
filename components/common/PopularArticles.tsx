import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types/article';
import { Category } from '@/types/category';

interface PopularArticlesProps {
  articles: Article[];
  categories?: Category[];
}

export default function PopularArticles({ articles, categories = [] }: PopularArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  const formatDate = (date: Date | any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date.toDate?.() || date);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
  };

  const getArticleCategories = (categoryIds: string[]) => {
    return categories.filter(cat => categoryIds.includes(cat.id));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
        人気記事
      </h2>
      <div className="space-y-4">
        {articles.slice(0, 5).map((article) => {
          const articleCategories = getArticleCategories(article.categoryIds || []);
          
          return (
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
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                  {article.title}
                </h3>
                
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span>公開: {formatDate(article.publishedAt)}</span>
                    {article.updatedAt && (
                      <>
                        <span>•</span>
                        <span>更新: {formatDate(article.updatedAt)}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {article.viewCount !== undefined && (
                      <span>{article.viewCount.toLocaleString()} views</span>
                    )}
                    {articleCategories.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex gap-1 flex-wrap">
                          {articleCategories.slice(0, 2).map((cat) => (
                            <span key={cat.id} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

