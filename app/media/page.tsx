import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getRecentArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import MediaHeader from '@/components/layout/MediaHeader';
import SearchBar from '@/components/search/SearchBar';
import ArticleCard from '@/components/articles/ArticleCard';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
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
  
  // サイト設定、Themeを並列取得
  const [siteInfo, theme, recentArticles, popularArticles, allCategories] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getRecentArticlesServer(10, mediaId || undefined),
    getPopularArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
  ]);
  
  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(theme);
  
  // mediaIdでカテゴリーをフィルタリング
  const categories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // フッターブロックを取得（themeから）
  const footerBlocks = theme.footerBlocks?.filter(block => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter(content => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter(section => section.title || section.links?.length > 0) || [];

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

      {/* フッターコンテンツ（画面横いっぱい） */}
      {footerContents.length > 0 && (
        <section className="w-full">
          <FooterContentRenderer contents={footerContents} />
        </section>
      )}

      {/* フッター */}
      <footer style={{ backgroundColor: theme.footerBackgroundColor }} className="text-white">
        {footerTextLinkSections.length > 0 ? (
          <div className="py-12">
            <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 ${footerTextLinkSections.length === 1 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-8 pb-8`}>
              {/* 左カラム: ロゴとディスクリプション */}
              <div className="text-left">
                <h3 className="text-2xl font-bold mb-4">{siteInfo.name}</h3>
                {siteInfo.description && (
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {siteInfo.description}
                  </p>
                )}
              </div>

              {/* セクション */}
              {footerTextLinkSections.map((section, index) => {
                const validLinks = section.links?.filter(link => link.text && link.url) || [];
                if (!section.title && validLinks.length === 0) return null;

                return (
                  <div key={index} className="text-left lg:border-l lg:border-gray-600 lg:pl-8">
                    {section.title && (
                      <h3 className="text-base font-bold mb-4 uppercase tracking-wider">
                        {section.title}
                      </h3>
                    )}
                    {validLinks.length > 0 && (
                      <ul className="space-y-2">
                        {validLinks.map((link, linkIndex) => (
                          <li key={linkIndex}>
                            <a
                              href={link.url}
                              className="text-gray-300 hover:text-white transition-colors text-sm"
                              target={link.url.startsWith('http') ? '_blank' : undefined}
                              rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                            >
                              {link.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {/* コピーライト */}
            <div className="w-full border-t border-gray-700 pt-6">
              <p className="text-gray-400 text-sm text-center">
                © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
              </p>
            </div>
          </div>
        ) : (
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
        )}
      </footer>
    </div>
  );
}

