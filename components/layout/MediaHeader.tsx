import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types/article';

interface MediaHeaderProps {
  siteName: string;
  categories?: Category[];
}

export default function MediaHeader({ siteName, categories = [] }: MediaHeaderProps) {
  return (
    <>
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              {siteName}
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-700 hover:text-gray-900">
                トップ
              </Link>
              <Link href="/articles" className="text-gray-700 hover:text-gray-900">
                記事一覧
              </Link>
              <Link href="/search" className="text-gray-700 hover:text-gray-900">
                検索
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* カテゴリーバー */}
      {categories.length > 0 && (
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="flex-shrink-0 group"
                >
                  <div className="flex flex-col items-center gap-2 min-w-[100px]">
                    {category.imageUrl ? (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 ring-2 ring-gray-200 group-hover:ring-blue-500 transition-all">
                        <Image
                          src={category.imageUrl}
                          alt={category.imageAlt || category.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-gray-200 group-hover:ring-blue-500 transition-all">
                        <span className="text-2xl font-bold text-blue-600">
                          {category.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors text-center">
                      {category.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

