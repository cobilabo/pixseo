import { Metadata } from 'next';
import { getArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { getAllBlocksByPlacementServer } from '@/lib/firebase/blocks-server';
import MediaHeader from '@/components/layout/MediaHeader';
import ArticleCard from '@/components/articles/ArticleCard';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SearchBar from '@/components/search/SearchBar';

// ISR: 60秒ごとに再生成
export const revalidate = 60;

// 動的にメタデータを生成
export async function generateMetadata(): Promise<Metadata> {
  const mediaId = await getMediaIdFromHost();
  
  if (!mediaId) {
    return {
      title: '記事一覧 | ふらっと。',
      description: 'バリアフリー情報記事一覧',
    };
  }

  const siteInfo = await getSiteInfo(mediaId);
  
  return {
    title: `記事一覧 | ${siteInfo.name}`,
    description: siteInfo.description || 'バリアフリー情報記事一覧',
    robots: {
      index: siteInfo.allowIndexing,
      follow: siteInfo.allowIndexing,
    },
    icons: siteInfo.faviconUrl ? {
      icon: siteInfo.faviconUrl,
      apple: siteInfo.faviconUrl,
    } : undefined,
  };
}

export default async function ArticlesPage() {
  // mediaIdを取得
  const mediaId = await getMediaIdFromHost();
  
  // サイト設定、Theme、記事、カテゴリー、ブロックを並列取得
  const [siteInfo, theme, articles, allCategories, blocksByPlacement] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getArticlesServer({ limit: 30 }),
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      {/* Themeスタイル注入 */}
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* ヘッダー＆カテゴリーバー */}
      <MediaHeader siteName={siteInfo.name} categories={categories} siteInfo={siteInfo} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索バー */}
        <section className="mb-8">
          <SearchBar />
        </section>

        {/* 記事一覧 */}
        <section>
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-gray-900 mb-1">記事一覧</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider">All Articles</p>
          </div>
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">記事がまだありません</p>
            </div>
          )}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">© {new Date().getFullYear()} {siteInfo.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

