import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import { getCategoryServer, getCategoriesServer } from '@/lib/firebase/categories-server';
import { getArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FirstView from '@/components/layout/FirstView';
import ArticleCard from '@/components/articles/ArticleCard';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import TwitterTimeline from '@/components/common/TwitterTimeline';
import SidebarBanners from '@/components/common/SidebarBanners';

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
    description: category.description || `${category.name}に関する記事一覧`,
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
      description: category.description || `${category.name}に関する記事一覧`,
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
  const [siteInfo, theme, articles, popularArticles, allCategories] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getArticlesServer({ categoryId: category.id, limit: 30 }),
    getPopularArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
  ]);
  
  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(theme);
  
  const categories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // フッターブロックを取得（themeから）
  const footerBlocks = theme.footerBlocks?.filter(block => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter(content => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter(section => section.title || section.links?.length > 0) || [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      {/* Themeスタイル注入 */}
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* FV（ファーストビュー）- カテゴリ画像を使用 */}
      {(category.imageUrl || theme.firstView) && (
        <FirstView 
          settings={{
            imageUrl: category.imageUrl || theme.firstView?.imageUrl || '',
            catchphrase: '',
            description: ''
          }}
          customTitle={`${category.name}の記事`}
          customSubtitle="Category"
          showCustomContent={true}
        />
      )}

      {/* ヘッダー - FVの上に重ねる */}
      <MediaHeader 
        siteName={siteInfo.name} 
        siteInfo={siteInfo}
        menuSettings={theme.menuSettings}
        menuBackgroundColor={theme.menuBackgroundColor}
        menuTextColor={theme.menuTextColor}
      />

      {/* カテゴリーバー - 選択中のカテゴリを除外 */}
      <CategoryBar categories={categories} excludeCategoryId={category.id} variant="half" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* メインカラム（70%） */}
          <div className="flex-1 lg:w-[70%]">
            {/* 見出し */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">新着記事</h2>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Recent Articles</p>
            </div>

            {/* カテゴリー説明（オプション） */}
            {category.description && (
              <section className="mb-8">
                <p className="text-gray-600 text-center">{category.description}</p>
              </section>
            )}

            {/* 記事一覧 */}
            <section>
              {articles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          {/* サイドバー（30%） */}
          <aside className="w-full lg:w-[30%] space-y-6">
            {/* 人気記事 */}
            <PopularArticles articles={popularArticles} />

            {/* おすすめ記事 */}
            <RecommendedArticles articles={articles} />

            {/* バナーエリア */}
            {footerBlocks.length > 0 && (
              <SidebarBanners blocks={footerBlocks} />
            )}

            {/* Xタイムライン */}
            <TwitterTimeline username="moncson" />
          </aside>
        </div>
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
            <div className={`w-full grid ${footerTextLinkSections.length === 1 ? 'grid-cols-2' : 'grid-cols-3'} pb-8`}>
              {/* 左カラム: ロゴとディスクリプション */}
              <div className="text-left px-8">
                <div className="flex items-center gap-3 mb-4">
                  {siteInfo.faviconUrl && (
                    <Image
                      src={siteInfo.faviconUrl}
                      alt={`${siteInfo.name} アイコン`}
                      width={32}
                      height={32}
                      className="w-8 h-8 brightness-0 invert"
                      unoptimized={siteInfo.faviconUrl.endsWith('.svg')}
                    />
                  )}
                  {siteInfo.logoUrl ? (
                    <Image
                      src={siteInfo.logoUrl}
                      alt={siteInfo.name}
                      width={120}
                      height={32}
                      className="h-8 w-auto brightness-0 invert"
                      unoptimized={siteInfo.logoUrl.endsWith('.svg')}
                    />
                  ) : (
                    <h3 className="text-2xl font-bold">{siteInfo.name}</h3>
                  )}
                </div>
                {siteInfo.description && (
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                    {siteInfo.description}
                  </p>
                )}
              </div>

              {/* セクション */}
              {footerTextLinkSections.map((section, index) => {
                const validLinks = section.links?.filter(link => link.text && link.url) || [];
                if (!section.title && validLinks.length === 0) return null;

                return (
                  <div key={index} className="text-right border-l border-gray-600 px-8">
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
          <div className="max-w-7xl mx-auto px-0 py-12">
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

      {/* 上に戻るボタン */}
      <ScrollToTopButton primaryColor={theme.primaryColor} />
    </div>
  );
}


