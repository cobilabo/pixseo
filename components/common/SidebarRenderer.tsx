import { SideContentItem, SideContentHtmlItem } from '@/types/theme';
import { Article, Category } from '@/types/article';
import { Lang } from '@/types/lang';
import PopularArticles from './PopularArticles';
import RecommendedArticles from './RecommendedArticles';
import SidebarCategories from './SidebarCategories';
import SidebarHtmlContent from './SidebarHtmlContent';

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
  // 新形式が空でも、旧形式があればそれを使用
  let items: SideContentItem[];
  
  if (sideContentItems && sideContentItems.length > 0) {
    items = [...sideContentItems].sort((a, b) => a.order - b.order);
  } else if (sideContentHtmlItems && sideContentHtmlItems.length > 0) {
    // 旧形式のみがある場合、デフォルト + 旧形式を組み合わせ
    const defaultItems = getDefaultSideContentItems();
    const migratedHtmlItems: SideContentItem[] = sideContentHtmlItems.map((item, index) => ({
      id: item.id || `legacy-html-${index}`,
      type: 'html' as const,
      isEnabled: item.isEnabled,
      order: defaultItems.length + index,
      title: item.title,
      htmlCode: item.htmlCode,
    }));
    items = [...defaultItems, ...migratedHtmlItems];
  } else {
    items = getDefaultSideContentItems();
  }

  // 有効な項目のみフィルタリング
  const enabledItems = items.filter(item => item.isEnabled);

  return (
    <>
      {enabledItems.map((item) => {
        switch (item.type) {
          case 'popularArticles':
            const limitedPopular = popularArticles.slice(0, item.displayCount || 5);
            if (limitedPopular.length === 0) return null;
            return (
              <PopularArticles
                key={item.id}
                articles={limitedPopular}
                categories={categories}
                lang={lang}
              />
            );
          case 'recommendedArticles':
            const limitedRecommended = recommendedArticles.slice(0, item.displayCount || 5);
            if (limitedRecommended.length === 0) return null;
            return (
              <RecommendedArticles
                key={item.id}
                articles={limitedRecommended}
                categories={categories}
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
              <SidebarHtmlContent
                key={item.id}
                htmlCode={item.htmlCode}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
