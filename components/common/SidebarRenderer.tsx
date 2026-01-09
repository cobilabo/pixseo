'use client';

import { SideContentItem, SideContentHtmlItem } from '@/types/theme';
import { Article, Category } from '@/types/article';
import { Lang } from '@/types/lang';
import PopularArticles from './PopularArticles';
import RecommendedArticles from './RecommendedArticles';
import SidebarCategories from './SidebarCategories';

interface CategoryWithCount extends Category {
  articleCount?: number;
}

interface SidebarRendererProps {
  sideContentItems?: SideContentItem[];
  // 後方互換性のため
  sideContentHtmlItems?: SideContentHtmlItem[];
  popularArticles: Article[];
  recommendedArticles: Article[];
  categories: CategoryWithCount[];
  lang?: Lang;
}

// デフォルトのサイドコンテンツ設定
const getDefaultSideContentItems = (): SideContentItem[] => {
  return [
    { id: 'default-popular', type: 'popularArticles', isEnabled: true, order: 0, displayCount: 5 },
    { id: 'default-recommended', type: 'recommendedArticles', isEnabled: true, order: 1, displayCount: 5 },
  ];
};

export default function SidebarRenderer({
  sideContentItems,
  sideContentHtmlItems,
  popularArticles,
  recommendedArticles,
  categories,
  lang = 'ja',
}: SidebarRendererProps) {
  // 設定がない場合はデフォルト設定を使用
  const items = sideContentItems && sideContentItems.length > 0
    ? [...sideContentItems].sort((a, b) => a.order - b.order)
    : getDefaultSideContentItems();

  // 有効な項目のみフィルタリング
  const enabledItems = items.filter(item => item.isEnabled);

  return (
    <div className="space-y-6">
      {enabledItems.map((item) => {
        switch (item.type) {
          case 'popularArticles':
            return (
              <PopularArticlesWrapper
                key={item.id}
                articles={popularArticles}
                categories={categories}
                displayCount={item.displayCount || 5}
                lang={lang}
              />
            );
          case 'recommendedArticles':
            return (
              <RecommendedArticlesWrapper
                key={item.id}
                articles={recommendedArticles}
                categories={categories}
                displayCount={item.displayCount || 5}
                lang={lang}
              />
            );
          case 'categories':
            return (
              <SidebarCategories
                key={item.id}
                categories={categories}
                lang={lang}
              />
            );
          case 'html':
            if (!item.htmlCode?.trim()) return null;
            return (
              <div
                key={item.id}
                className="sidebar-custom-html"
                dangerouslySetInnerHTML={{ __html: item.htmlCode }}
              />
            );
          default:
            return null;
        }
      })}

      {/* 後方互換性: 旧形式のHTMLアイテムも表示 */}
      {sideContentHtmlItems && sideContentHtmlItems.length > 0 && (
        <>
          {sideContentHtmlItems
            .filter(item => item.isEnabled && item.htmlCode?.trim())
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((item) => (
              <div
                key={item.id}
                className="sidebar-custom-html"
                dangerouslySetInnerHTML={{ __html: item.htmlCode }}
              />
            ))}
        </>
      )}
    </div>
  );
}

// 人気記事ラッパー（表示件数制御）
function PopularArticlesWrapper({
  articles,
  categories,
  displayCount,
  lang,
}: {
  articles: Article[];
  categories: Category[];
  displayCount: number;
  lang: Lang;
}) {
  const limitedArticles = articles.slice(0, displayCount);
  if (limitedArticles.length === 0) return null;
  return <PopularArticles articles={limitedArticles} categories={categories} lang={lang} />;
}

// おすすめ記事ラッパー（表示件数制御）
function RecommendedArticlesWrapper({
  articles,
  categories,
  displayCount,
  lang,
}: {
  articles: Article[];
  categories: Category[];
  displayCount: number;
  lang: Lang;
}) {
  const limitedArticles = articles.slice(0, displayCount);
  if (limitedArticles.length === 0) return null;
  return <RecommendedArticles articles={limitedArticles} categories={categories} lang={lang} />;
}
