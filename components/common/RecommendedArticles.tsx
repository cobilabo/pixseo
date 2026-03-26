import { Lang } from '@/types/lang';
import { Article, Category } from '@/types/article';
import { t } from '@/lib/i18n/translations';
import SidebarArticleSection from './SidebarArticleSection';

interface RecommendedArticlesProps {
  articles: Article[];
  categories?: Category[];
  lang?: Lang;
}

export default function RecommendedArticles({ articles, categories = [], lang = 'ja' }: RecommendedArticlesProps) {
  return (
    <SidebarArticleSection
      title={t('section.recommendedArticles', lang)}
      articles={articles}
      categories={categories}
      lang={lang}
    />
  );
}
