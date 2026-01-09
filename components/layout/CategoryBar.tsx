import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types/article';
import { Lang } from '@/types/lang';
import { NavigationItem } from '@/types/theme';

interface CategoryBarProps {
  categories: Category[];
  excludeCategoryId?: string;
  variant?: 'full' | 'half';
  lang?: Lang;
  globalNavItems?: NavigationItem[];
}

// グローバルメニュー項目のURLを生成
const getNavItemUrl = (item: NavigationItem, lang: Lang): string => {
  switch (item.type) {
    case 'top':
      return `/${lang}`;
    case 'search':
      return `/${lang}/search`;
    case 'page':
      return item.pageSlug ? `/${lang}/${item.pageSlug}` : `/${lang}`;
    case 'category':
      return item.categorySlug ? `/${lang}/categories/${item.categorySlug}` : `/${lang}`;
    default:
      return `/${lang}`;
  }
};

// 言語に応じたラベルを取得
const getNavItemLabel = (item: NavigationItem, lang: Lang): string => {
  const langKey = `label_${lang}` as keyof NavigationItem;
  return (item[langKey] as string) || item.label || '';
};

export default function CategoryBar({ categories, excludeCategoryId, variant = 'half', lang = 'ja', globalNavItems = [] }: CategoryBarProps) {
  // グローバルメニューが設定されている場合はそれを表示
  if (globalNavItems.length > 0) {
    return (
      <section className="relative z-20 pt-12 pb-8 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl overflow-hidden">
            <div className="flex overflow-x-auto scrollbar-hide">
              {globalNavItems.map((item, index) => {
                const label = getNavItemLabel(item, lang);
                const url = getNavItemUrl(item, lang);
                
                // カテゴリータイプの場合、対応するカテゴリー情報を取得して画像を表示
                const matchedCategory = item.type === 'category' && item.categoryId
                  ? categories.find(cat => cat.id === item.categoryId)
                  : null;
                
                return (
                  <Link
                    key={item.id}
                    href={url}
                    className={`relative flex-1 min-w-[150px] ${variant === 'full' ? 'h-96' : 'h-48'} group overflow-hidden`}
                  >
                    {matchedCategory?.imageUrl ? (
                      <>
                        {/* 背景画像（カテゴリー） */}
                        <div className="absolute inset-0 overflow-hidden">
                          <Image
                            src={matchedCategory.imageUrl}
                            alt={matchedCategory.imageAlt || label}
                            fill
                            className="object-cover transition-all duration-300 group-hover:grayscale group-hover:scale-110"
                            sizes="(max-width: 768px) 150px, 200px"
                          />
                        </div>
                        {/* グラデーションオーバーレイ */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      </>
                    ) : (
                      <>
                        {/* グラデーション背景（デフォルト） */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 transition-all duration-300 group-hover:grayscale" />
                        {/* テキストオーバーレイ */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl font-bold text-white/30">
                            {label.charAt(0)}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {/* ラベル */}
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <span className="text-white font-bold text-[10px] md:text-lg text-center drop-shadow-lg block">
                        {label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 選択中のカテゴリを除外
  const filteredCategories = excludeCategoryId 
    ? categories.filter(cat => cat.id !== excludeCategoryId)
    : categories;

  if (filteredCategories.length === 0) {
    return null;
  }

  // 高さを制御（デフォルトは半分）
  const categoryHeight = variant === 'full' ? 'h-96' : 'h-48';

  return (
    <section className="relative z-20 pt-12 pb-8 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide">
            {filteredCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/${lang}/categories/${category.slug}`}
                className={`relative flex-1 min-w-[150px] ${categoryHeight} group overflow-hidden`}
              >
              {category.imageUrl ? (
                <>
                  {/* 背景画像 */}
                  <div className="absolute inset-0 overflow-hidden">
                    <Image
                      src={category.imageUrl}
                      alt={category.imageAlt || category.name}
                      fill
                      className="object-cover transition-all duration-300 group-hover:grayscale group-hover:scale-110"
                      sizes="(max-width: 768px) 150px, 200px"
                    />
                  </div>
                  {/* グラデーションオーバーレイ */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                </>
              ) : (
                <>
                  {/* グラデーション背景（画像がない場合） */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 transition-all duration-300 group-hover:grayscale" />
                  {/* テキストオーバーレイ */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl font-bold text-white/30">
                      {category.name.charAt(0)}
                    </span>
                  </div>
                </>
              )}
              
              {/* カテゴリー名 */}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <span className="text-white font-bold text-[10px] md:text-lg text-center drop-shadow-lg block">
                  {category.name}
                </span>
              </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

