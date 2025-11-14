import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types/article';

interface CategoryBarProps {
  categories: Category[];
  excludeCategoryId?: string;
}

export default function CategoryBar({ categories, excludeCategoryId }: CategoryBarProps) {
  // 選択中のカテゴリを除外
  const filteredCategories = excludeCategoryId 
    ? categories.filter(cat => cat.id !== excludeCategoryId)
    : categories;

  if (filteredCategories.length === 0) {
    return null;
  }

  // カテゴリページ（excludeCategoryIdが指定されている）では高さを半分に
  const categoryHeight = excludeCategoryId ? 'h-48' : 'h-96';

  return (
    <section className="relative z-20 pt-12 pb-8 rounded-t-3xl bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex overflow-x-auto scrollbar-hide">
          {filteredCategories.map((category, index) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className={`relative flex-1 min-w-[150px] ${categoryHeight} group overflow-hidden ${
                index === 0 ? 'rounded-tl-3xl rounded-bl-3xl' : ''
              } ${
                index === filteredCategories.length - 1 ? 'rounded-tr-3xl rounded-br-3xl' : ''
              }`}
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
                <h3 className="text-white font-bold text-lg text-center drop-shadow-lg">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

