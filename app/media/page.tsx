import { Metadata } from 'next';
import Link from 'next/link';
import { getRecentArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import SearchBar from '@/components/search/SearchBar';
import ArticleCard from '@/components/articles/ArticleCard';
import ExternalLinks from '@/components/common/ExternalLinks';
import RecommendedCategories from '@/components/common/RecommendedCategories';
import PopularKeywords from '@/components/search/PopularKeywords';

export const metadata: Metadata = {
  title: 'ふらっと。 | バリアフリー情報メディア',
  description: 'おでかけ・外出に役立つバリアフリー情報を探す',
  openGraph: {
    title: 'ふらっと。 | バリアフリー情報メディア',
    description: 'おでかけ・外出に役立つバリアフリー情報を探す',
  },
};

// ISR: 60秒ごとに再生成（SEOに強く、高速）
export const revalidate = 60;

export default async function MediaPage() {
  // 記事データを取得（サーバーサイド）
  const recentArticles = await getRecentArticlesServer(10);
  const popularArticles = await getPopularArticlesServer(10);

  // JSON-LD 構造化データ（WebSite）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ふらっと。',
    description: 'バリアフリー情報メディア - おでかけ・外出に役立つバリアフリー情報を探す',
    url: 'https://the-ayumi.jp/media',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://the-ayumi.jp/media/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/media" className="text-2xl font-bold text-gray-900">
              ふらっと。
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/media" className="text-gray-700 hover:text-gray-900">
                トップ
              </Link>
              <Link href="/media/articles" className="text-gray-700 hover:text-gray-900">
                記事一覧
              </Link>
              <Link href="/media/search" className="text-gray-700 hover:text-gray-900">
                検索
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ファーストビュー: 検索バー */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              バリアフリー情報メディア
            </h1>
            <p className="text-lg text-gray-600">
              おでかけ・外出に役立つ情報を探す
            </p>
          </div>
          <SearchBar />
        </section>

        {/* よく検索されているキーワード */}
        <section className="mb-12">
          <PopularKeywords limit={10} />
        </section>

        {/* おすすめカテゴリー */}
        <section className="mb-12">
          <RecommendedCategories />
        </section>

        {/* 新着記事 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">新着記事</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.length > 0 ? (
              recentArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))
            ) : (
              <p className="text-gray-500 col-span-full text-center py-8">
                記事がまだありません
              </p>
            )}
          </div>
        </section>

        {/* 人気記事ランキング */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">人気記事ランキング</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularArticles.length > 0 ? (
              popularArticles.map((article, index) => (
                <div key={article.id} className="relative">
                  <span className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                    {index + 1}
                  </span>
                  <ArticleCard article={article} />
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-full text-center py-8">
                記事がまだありません
              </p>
            )}
          </div>
        </section>

        {/* 外部リンク */}
        <section className="mb-12">
          <ExternalLinks />
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">© 2024 Ayumi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

