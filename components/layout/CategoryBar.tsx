import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types/article';
import { Lang } from '@/types/lang';

interface CategoryBarProps {
  categories: Category[];
  excludeCategoryId?: string;
  variant?: 'full' | 'half';
  lang?: Lang;
}

export default function CategoryBar({ categories, excludeCategoryId, variant = 'half', lang = 'ja' }: CategoryBarProps) {
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
                <span className="text-white font-bold text-lg text-center drop-shadow-lg block">
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

