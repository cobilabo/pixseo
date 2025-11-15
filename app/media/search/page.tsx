import { Suspense } from 'react';
import Image from 'next/image';
import SearchContent from '@/components/search/SearchContent';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FirstView from '@/components/layout/FirstView';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import XLink from '@/components/common/XLink';
import SidebarBanners from '@/components/common/SidebarBanners';

export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  // サーバーサイドでデータを取得
  const mediaId = await getMediaIdFromHost();
  
  // サイト設定、Theme、カテゴリーを並列取得
  const [siteInfo, theme, allCategories, popularArticles, recentArticles] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getCategoriesServer(),
    getPopularArticlesServer(10, mediaId || undefined),
    getArticlesServer({ limit: 5, mediaId: mediaId || undefined }),
  ]);

  // mediaIdでカテゴリーをフィルタリング
  const categories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // スタイルとフッター情報を準備
  const combinedStyles = getCombinedStyles(theme);
  const footerBlocks = theme.footerBlocks?.filter(block => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter(content => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter(section => section.title || section.links?.length > 0) || [];

  return (
    <>
      {/* 検索結果ページはnoindex（クエリパラメータ付きの場合） */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (window.location.search.includes('q=') || 
                window.location.search.includes('categoryId=') || 
                window.location.search.includes('tagId=')) {
              const meta = document.createElement('meta');
              meta.name = 'robots';
              meta.content = 'noindex, nofollow';
              document.head.appendChild(meta);
            }
          `,
        }}
      />
      <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
        {/* Themeスタイル注入 */}
        <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* FV（ファーストビュー）- 最上部に配置 */}
      {theme.firstView && (
        <FirstView 
          settings={theme.firstView}
          customTitle="検索"
          customSubtitle="SEARCH"
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

      {/* カテゴリーバー */}
      <CategoryBar categories={categories} variant="half" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* メインカラム（70%） */}
          <div className="flex-1 lg:w-[70%]">
            {/* 検索コンテンツ */}
            <Suspense fallback={<div className="text-center py-12">読み込み中...</div>}>
              <SearchContent faviconUrl={siteInfo.faviconUrl} />
            </Suspense>
            </div>

            {/* サイドバー（30%） */}
            <aside className="w-full lg:w-[30%] space-y-6">
              {/* 人気記事 */}
              <PopularArticles articles={popularArticles} categories={allCategories} />

              {/* おすすめ記事 */}
              <RecommendedArticles articles={recentArticles} categories={allCategories} />

              {/* バナーエリア */}
              {footerBlocks.length > 0 && (
                <SidebarBanners blocks={footerBlocks} />
              )}

              {/* Xタイムライン */}
              <XLink username="moncson" />
            </aside>
          </div>
        </main>

        {/* フッターコンテンツ */}
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
    </>
  );
}
