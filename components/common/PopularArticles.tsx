import Link from 'next/link';
import Image from 'next/image';
import { Article, Category } from '@/types/article';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface PopularArticlesProps {
  articles: Article[];
  categories?: Category[];
  lang?: Lang;
}

export default function PopularArticles({ articles, categories = [], lang = 'ja' }: PopularArticlesProps) {
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
        {t('section.popularArticles', lang)}
      </h2>
      <div className="space-y-4">
        {articles.map((article) => {
          const articleCategories = getArticleCategories(article.categoryIds || []);
          
          return (
            <Link
              key={article.id}
              href={`/${lang}/articles/${article.slug}`}
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
                <h3 className="text-sm font-medium line-clamp-2 mb-2 transition-colors" style={{ color: 'var(--link-text-color, #1f2937)' }}>
                  <span className="group-hover:hidden">{article.title}</span>
                  <span className="hidden group-hover:inline" style={{ color: 'var(--link-hover-color, #2563eb)' }}>
                    {article.title}
                  </span>
                </h3>
                
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span>{t('article.publishedAt', lang)}: {formatDate(article.publishedAt)}</span>
                    {article.updatedAt && (
                      <>
                        <span>•</span>
                        <span>{t('article.updatedAt', lang)}: {formatDate(article.updatedAt)}</span>
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
                          {articleCategories.slice(0, 2).map((cat) => {
                            const categoryName = (cat as any)[`name_${lang}`] || cat.name;
                            return (
                              <span 
                                key={cat.id} 
                                className="px-1.5 py-0.5 rounded text-xs font-medium"
                                style={{ 
                                  backgroundColor: 'color-mix(in srgb, var(--primary-color, #3b82f6) 15%, white)',
                                  color: 'var(--primary-color, #3b82f6)'
                                }}
                              >
                                {categoryName}
                              </span>
                            );
                          })}
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

