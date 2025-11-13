import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getRecentArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { getAllBlocksByPlacementServer } from '@/lib/firebase/blocks-server';
import MediaHeader from '@/components/layout/MediaHeader';
import SearchBar from '@/components/search/SearchBar';
import ArticleCard from '@/components/articles/ArticleCard';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import ExternalLinks from '@/components/common/ExternalLinks';
import RecommendedCategories from '@/components/common/RecommendedCategories';

// 動的レンダリング + Firestoreキャッシュで高速化
// headers()を使用しているため、完全な静的生成はできない
// が、メモリキャッシュ（5分）により 30〜50ms の高速応答を実現
export const dynamic = 'force-dynamic';

// 動的にメタデータを生成
export async function generateMetadata(): Promise<Metadata> {
  const mediaId = await getMediaIdFromHost();
  
  if (!mediaId) {
    return {
      title: 'ふらっと。 | バリアフリー情報メディア',
      description: 'おでかけ・外出に役立つバリアフリー情報を探す',
    };
  }

  const siteInfo = await getSiteInfo(mediaId);
  
  return {
    title: siteInfo.mainTitle || `${siteInfo.name} | バリアフリー情報メディア`,
    description: siteInfo.description || 'おでかけ・外出に役立つバリアフリー情報を探す',
    robots: {
      index: siteInfo.allowIndexing,
      follow: siteInfo.allowIndexing,
    },
    icons: siteInfo.faviconUrl ? {
      icon: siteInfo.faviconUrl,
      apple: siteInfo.faviconUrl,
    } : undefined,
    openGraph: {
      title: siteInfo.mainTitle || `${siteInfo.name} | バリアフリー情報メディア`,
      description: siteInfo.description || 'おでかけ・外出に役立つバリアフリー情報を探す',
      images: siteInfo.ogImageUrl ? [siteInfo.ogImageUrl] : undefined,
    },
  };
}

export default async function MediaPage() {
  // mediaIdを取得
  const mediaId = await getMediaIdFromHost();
  const headersList = headers();
  const host = headersList.get('host') || '';
  
  // サイト設定、Theme、ブロックを並列取得
  const [siteInfo, theme, recentArticles, popularArticles, allCategories, blocksByPlacement] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getRecentArticlesServer(10, mediaId || undefined),
    getPopularArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
    mediaId ? getAllBlocksByPlacementServer(mediaId, theme.layoutTheme) : Promise.resolve({}),
  ]);
  
  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(theme);
  
  // mediaIdでカテゴリーをフィルタリング
  const categories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // 各配置場所のブロックを取得
  const footerBlocks = blocksByPlacement['footer'] || [];
  const sidePanelBlocks = blocksByPlacement['side-panel'] || [];

  // JSON-LD 構造化データ（WebSite）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteInfo.name,
    description: siteInfo.description,
    url: `https://${host}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `https://${host}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      {/* Themeスタイル注入 */}
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ヘッダー＆カテゴリーバー */}
      <MediaHeader siteName={siteInfo.name} categories={categories} siteInfo={siteInfo} />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ファーストビュー: 検索バー */}
        <section className="mb-12">
          <SearchBar />
        </section>

        {/* おすすめカテゴリー */}
        <section className="mb-12">
          <RecommendedCategories />
        </section>

        {/* 新着記事 */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">新着記事</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Recent Articles</p>
          </div>
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
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">人気記事ランキング</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Popular Articles</p>
          </div>
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

        {/* ブロック表示エリア（フッター上部） */}
        {footerBlocks.length > 0 && (
          <section className="mb-12">
            <BlockRenderer blocks={footerBlocks} />
          </section>
        )}
      </main>

      {/* フッター */}
      <footer style={{ backgroundColor: theme.footerBackgroundColor }} className="text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">{siteInfo.name}</h3>
            {siteInfo.description && (
              <p className="text-gray-300 max-w-2xl mx-auto">
                {siteInfo.description}
              </p>
            )}
            <p className="text-gray-400 text-sm pt-4">
              © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

