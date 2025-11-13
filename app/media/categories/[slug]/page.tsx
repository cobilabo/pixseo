import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getCategoryServer, getCategoriesServer } from '@/lib/firebase/categories-server';
import { getArticlesServer } from '@/lib/firebase/articles-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import MediaHeader from '@/components/layout/MediaHeader';
import ArticleCard from '@/components/articles/ArticleCard';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SearchBar from '@/components/search/SearchBar';

// ISR: 60秒ごとに再生成
export const revalidate = 60;

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [category, mediaId] = await Promise.all([
    getCategoryServer(params.slug),
    getMediaIdFromHost(),
  ]);
  
  if (!category) {
    return {
      title: 'カテゴリーが見つかりません | ふらっと。',
    };
  }

  const siteInfo = mediaId ? await getSiteInfo(mediaId) : { name: 'ふらっと。', allowIndexing: false, faviconUrl: undefined };

  return {
    title: `${category.name}の記事一覧 | ${siteInfo.name}`,
    description: category.description || `${category.name}に関するバリアフリー情報記事一覧`,
    robots: {
      index: siteInfo.allowIndexing,
      follow: siteInfo.allowIndexing,
    },
    icons: siteInfo.faviconUrl ? {
      icon: siteInfo.faviconUrl,
      apple: siteInfo.faviconUrl,
    } : undefined,
    openGraph: {
      title: `${category.name}の記事一覧 | ${siteInfo.name}`,
      description: category.description || `${category.name}に関するバリアフリー情報記事一覧`,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const [category, mediaId] = await Promise.all([
    getCategoryServer(params.slug),
    getMediaIdFromHost(),
  ]);

  if (!category) {
    notFound();
  }

  // サイト設定、Theme、記事、カテゴリーを並列取得
  const [siteInfo, theme, articles, allCategories] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getArticlesServer({ categoryId: category.id, limit: 30 }),
    getCategoriesServer(),
  ]);
  
  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(theme);
  
  const categories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // フッターブロックを取得（themeから）
  const footerBlocks = theme.footerBlocks?.filter(block => block.imageUrl) || [];

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

        {/* カテゴリーヘッダー */}
        <section className="mb-8">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {category.name}の記事
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Category</p>
          </div>
          {category.description && (
            <p className="text-gray-600 text-center">{category.description}</p>
          )}
        </section>

        {/* 記事一覧 */}
        <section>
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">このカテゴリーにはまだ記事がありません</p>
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


