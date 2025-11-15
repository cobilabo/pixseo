import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getWriterServer, getArticlesByWriterServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer as getAllCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { FooterContent, FooterTextLinkSection } from '@/types/theme';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FirstView from '@/components/layout/FirstView';
import ArticleCard from '@/components/articles/ArticleCard';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import XLink from '@/components/common/XLink';
import SidebarBanners from '@/components/common/SidebarBanners';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const mediaId = await getMediaIdFromHost();
  const writer = await getWriterServer(params.id);
  
  if (!writer) {
    return {
      title: 'ライターが見つかりません',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { allowIndexing: siteAllowIndexing, name: siteName, faviconUrl } = mediaId 
    ? await getSiteInfo(mediaId) 
    : { allowIndexing: false, name: 'メディアサイト', faviconUrl: undefined };
  
  const headersList = headers();
  const host = headersList.get('host') || '';
  const canonicalUrl = `https://${host}/writers/${writer.id}`;

  return {
    title: `${writer.handleName} | ${siteName}`,
    description: writer.bio || `${writer.handleName}の記事一覧`,
    robots: {
      index: siteAllowIndexing,
      follow: siteAllowIndexing,
    },
    icons: faviconUrl ? {
      icon: faviconUrl,
      apple: faviconUrl,
    } : undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: writer.handleName,
      description: writer.bio || `${writer.handleName}の記事一覧`,
      url: canonicalUrl,
      images: writer.icon ? [{ url: writer.icon }] : [],
    },
  };
}

export default async function WriterPage({ params }: PageProps) {
  const mediaId = await getMediaIdFromHost();
  const writer = await getWriterServer(params.id);
  
  if (!writer) {
    notFound();
  }

  // サイト情報、テーマ、記事、カテゴリー、人気記事を取得
  const [siteInfo, theme, articles, allCategories, popularArticles] = await Promise.all([
    mediaId ? getSiteInfo(mediaId) : Promise.resolve({ name: 'メディアサイト', description: '', logoUrl: '', faviconUrl: '', allowIndexing: false }),
    mediaId ? getTheme(mediaId) : Promise.resolve({} as any),
    getArticlesByWriterServer(params.id, mediaId || undefined, 50),
    getAllCategoriesServer().catch(() => []),
    getPopularArticlesServer(10, mediaId || undefined).catch(() => []),
  ]);

  const siteName = siteInfo.name;

  // mediaIdでカテゴリーをフィルタリング
  const headerCategories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(theme);
  
  // フッターデータを取得
  const footerContents = theme.footerContents?.filter((content: FooterContent) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: FooterTextLinkSection) => section.title || section.links?.length > 0) || [];
  
  const headersList = headers();
  const host = headersList.get('host') || '';

  // JSON-LD 構造化データ（Person schema）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: writer.handleName,
    description: writer.bio || '',
    image: writer.icon || '',
    url: `https://${host}/writers/${writer.id}`,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* CSS変数とカスタムCSS */}
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* ヘッダー */}
      <MediaHeader 
        siteName={siteName}
        siteInfo={siteInfo}
        menuSettings={theme.menuSettings}
        menuBackgroundColor={theme.menuBackgroundColor}
        menuTextColor={theme.menuTextColor}
      />

      {/* FV（ライター用） */}
      {writer.backgroundImage && (
        <FirstView
          settings={{
            imageUrl: writer.backgroundImage,
            catchphrase: writer.handleName,
            description: `${articles.length} 記事`,
          }}
          customTitle={writer.handleName}
          customSubtitle="WRITER"
          showCustomContent={true}
        />
      )}

      {/* カテゴリーバー */}
      <CategoryBar 
        categories={headerCategories}
        variant="half"
      />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左側：記事一覧 */}
          <div className="flex-1 lg:w-[70%]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
              新着記事 <span className="text-base font-normal text-gray-500">/ Recent Articles</span>
            </h2>

            {articles.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 flex flex-col items-center justify-center text-gray-400">
                {siteInfo.faviconUrl ? (
                  <div className="relative w-20 h-20 mb-4 opacity-30">
                    <Image
                      src={siteInfo.faviconUrl}
                      alt="Site Icon"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <p className="text-sm">このカテゴリーにはまだ記事がありません</p>
              </div>
            ) : (
              <div className="space-y-6">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 右側：サイドバー */}
          <aside className="w-full lg:w-[30%] space-y-6">
            {/* 人気記事 */}
            <PopularArticles articles={popularArticles} categories={allCategories} />

            {/* おすすめ記事 */}
            <RecommendedArticles articles={articles.slice(0, 5)} categories={allCategories} />

            {/* Xリンク */}
            <XLink username="moncson" />

            {/* バナーエリア */}
            {theme.bannerBlocks && theme.bannerBlocks.length > 0 && (
              <SidebarBanners blocks={theme.bannerBlocks} />
            )}
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
              {footerTextLinkSections.map((section: FooterTextLinkSection, index: number) => {
                const isLastSection = index === footerTextLinkSections.length - 1;
                const showBorderLeft = footerTextLinkSections.length === 2 || index > 0;

                return (
                  <div 
                    key={index} 
                    className={`text-left px-8 ${showBorderLeft ? 'border-l border-gray-600' : ''}`}
                  >
                    {section.title && (
                      <h4 className="text-base font-bold mb-4">{section.title}</h4>
                    )}
                    {section.links && section.links.length > 0 && (
                      <ul className="space-y-2">
                        {section.links
                          .filter(link => link.text && link.url)
                          .map((link, linkIndex) => (
                            <li key={linkIndex}>
                              <a
                                href={link.url}
                                className="text-sm text-gray-300 hover:text-white transition-colors"
                                target={link.url.startsWith('http') ? '_blank' : '_self'}
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

            {/* コピーライト（横線の下） */}
            <div className="border-t border-gray-600 pt-8 text-center">
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
              </p>
            </div>
          </div>
        ) : (
          /* フッターテキストリンクがない場合 */
          <div className="text-center py-12">
            <div className="flex justify-center items-center gap-3 mb-4">
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
              <p className="text-gray-300 text-sm leading-relaxed mb-8 whitespace-pre-line">
                {siteInfo.description}
              </p>
            )}
            <div className="border-t border-gray-600 pt-8">
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
              </p>
            </div>
          </div>
        )}
      </footer>

      {/* スクロールトップボタン */}
      <ScrollToTopButton />
    </div>
  );
}
