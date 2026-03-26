import { Lang } from '@/types/lang';
import { Article, Category } from '@/types/article';
import { t } from '@/lib/i18n/translations';
import SidebarArticleSection from './SidebarArticleSection';

interface RecentArticlesProps {
  articles: Article[];
  categories?: Category[];
  lang?: Lang;
}

export default function RecentArticles({ articles, categories = [], lang = 'ja' }: RecentArticlesProps) {
  return (
    <SidebarArticleSection
      title={t('section.recentArticles', lang)}
      articles={articles}
      categories={categories}
      lang={lang}
    />
  );
}
