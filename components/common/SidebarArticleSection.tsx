import Link from 'next/link';
import Image from 'next/image';
import { Article, Category } from '@/types/article';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

function formatDate(date: Date | any) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date.toDate?.() || date);
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function SidebarArticleCard({
  article,
  categories,
  lang,
}: {
  article: Article;
  categories: Category[];
  lang: Lang;
}) {
  const title = (article as any)[`title_${lang}`] || article.title;
  const excerptRaw = (article as any)[`excerpt_${lang}`] || article.excerpt;
  const excerpt = typeof excerptRaw === 'string' ? excerptRaw.trim() : '';
  const articleCategories = categories.filter((cat) => (article.categoryIds || []).includes(cat.id));

  return (
    <Link
      href={`/${lang}/articles/${article.slug}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
    >
      {article.featuredImage ? (
        <div className="relative w-full aspect-video bg-gray-200">
          <Image
            src={article.featuredImage}
            alt={article.featuredImageAlt || title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 42vw, 180px"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-gray-200 to-gray-300" aria-hidden />
      )}
      <div className="p-2.5">
        <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1.5 leading-snug">{title}</h3>
        {excerpt.length > 0 ? (
          <p className="text-[11px] text-gray-600 mb-2 line-clamp-2">{excerpt}</p>
        ) : null}
        <div className="space-y-1 text-[10px] text-gray-500">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <span>
              {t('article.publishedAt', lang)}: {formatDate(article.publishedAt)}
            </span>
            {article.updatedAt ? (
              <>
                <span>•</span>
                <span>
                  {t('article.updatedAt', lang)}: {formatDate(article.updatedAt)}
                </span>
              </>
            ) : null}
          </div>
          {(article.viewCount !== undefined || articleCategories.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {article.viewCount !== undefined ? (
                <span>{t('article.viewCount', lang, { count: (article.viewCount ?? 0).toLocaleString() })}</span>
              ) : null}
              {article.viewCount !== undefined && articleCategories.length > 0 ? <span>•</span> : null}
              {articleCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {articleCategories.slice(0, 2).map((cat) => {
                    const categoryName = (cat as any)[`name_${lang}`] || cat.name;
                    return (
                      <span
                        key={cat.id}
                        className="px-1 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--primary-color, #3b82f6) 15%, white)',
                          color: 'var(--primary-color, #3b82f6)',
                        }}
                      >
                        {categoryName}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

interface SidebarArticleSectionProps {
  title: string;
  articles: Article[];
  categories?: Category[];
  lang?: Lang;
}

/**
 * メインの ArticleBlock / ArticleCard と同様、サムネイル上・テキスト下のカードを 2 カラムで表示
 */
export default function SidebarArticleSection({
  title,
  articles,
  categories = [],
  lang = 'ja',
}: SidebarArticleSectionProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {articles.map((article) => (
          <SidebarArticleCard key={article.id} article={article} categories={categories} lang={lang} />
        ))}
      </div>
    </div>
  );
}
