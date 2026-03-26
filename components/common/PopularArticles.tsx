import { Lang } from '@/types/lang';
import { Article, Category } from '@/types/article';
import { t } from '@/lib/i18n/translations';
import SidebarArticleSection from './SidebarArticleSection';

interface PopularArticlesProps {
  articles: Article[];
  categories?: Category[];
  lang?: Lang;
}

export default function PopularArticles({ articles, categories = [], lang = 'ja' }: PopularArticlesProps) {
  return (
    <SidebarArticleSection
      title={t('section.popularArticles', lang)}
      articles={articles}
      categories={categories}
      lang={lang}
    />
  );
}
