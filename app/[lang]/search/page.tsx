import { Suspense } from 'react';
import { Metadata } from 'next';
import { headers } from 'next/headers';
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
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizeCategory, localizeArticle } from '@/lib/i18n/localize';

interface PageProps {
  params: {
    lang: string;
  };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const mediaId = await getMediaIdFromHost();
  const headersList = headers();
  const host = headersList.get('host') || '';
  
  const rawSiteInfo = mediaId 
    ? await getSiteInfo(mediaId)
    : {
        name: 'メディアサイト',
        name_ja: 'メディアサイト',
        name_en: 'Media Site',
        name_zh: '媒体网站',
        name_ko: '미디어 사이트',
        description: '',
        logoUrl: '',
        faviconUrl: '',
        allowIndexing: false,
      };

  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);

  const title = `検索 | ${siteInfo.name}`;
  const description = `${siteInfo.name}の記事を検索`;

  return {
    title,
    description,
    robots: {
      index: false, // 検索ページはnoindex
      follow: true,
    },
    alternates: {
      canonical: `https://${host}/${lang}/search`,
      languages: {
        'ja-JP': `https://${host}/ja/search`,
        'en-US': `https://${host}/en/search`,
        'zh-CN': `https://${host}/zh/search`,
        'ko-KR': `https://${host}/ko/search`,
        'x-default': `https://${host}/ja/search`,
      },
    },
    openGraph: {
      title,
      description,
      locale: LANG_REGIONS[lang],
      alternateLocale: SUPPORTED_LANGS.filter(l => l !== lang).map(l => LANG_REGIONS[l]),
    },
  };
}

export default async function SearchPage({ params }: PageProps) {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  
  // サーバーサイドでデータを取得
  const mediaId = await getMediaIdFromHost();
  
  // サイト設定、Theme、カテゴリーを並列取得
  const [rawSiteInfo, rawTheme, allCategories, popularArticles, recentArticles] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getCategoriesServer(),
    getPopularArticlesServer(10, mediaId || undefined),
    getArticlesServer({ limit: 5, mediaId: mediaId || undefined }),
  ]);

  // 多言語化
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const categories = allCategories
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => localizeCategory(cat, lang));
  const localizedPopularArticles = popularArticles.map(art => localizeArticle(art, lang));
  const localizedRecentArticles = recentArticles.map(art => localizeArticle(art, lang));

  // スタイルとフッター情報を準備
  const combinedStyles = getCombinedStyles(rawTheme);
  const footerBlocks = rawTheme.footerBlocks?.filter((block: any) => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];

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
      <div className="min-h-screen" style={{ backgroundColor: rawTheme.backgroundColor }}>
        {/* Themeスタイル注入 */}
        <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* FV（ファーストビュー）- 最上部に配置 */}
      {rawTheme.firstView && (
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
          siteInfo={rawSiteInfo}
          menuSettings={theme.menuSettings}
          menuBackgroundColor={rawTheme.menuBackgroundColor}
          menuTextColor={rawTheme.menuTextColor}
          lang={lang}
        />

      {/* カテゴリーバー */}
      <CategoryBar categories={categories} variant="half" lang={lang} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ backgroundColor: rawTheme.backgroundColor }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* メインカラム（70%） */}
          <div className="flex-1 lg:w-[70%]">
            {/* 検索コンテンツ */}
            <Suspense fallback={<div className="text-center py-12">読み込み中...</div>}>
              <SearchContent faviconUrl={rawSiteInfo.faviconUrl} mediaId={mediaId || undefined} lang={lang} />
            </Suspense>
            </div>

            {/* サイドバー（30%） */}
            <aside className="w-full lg:w-[30%] space-y-6">
              {/* 人気記事 */}
              <PopularArticles articles={localizedPopularArticles} categories={allCategories} lang={lang} />

              {/* おすすめ記事 */}
              <RecommendedArticles articles={localizedRecentArticles} categories={allCategories} lang={lang} />

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
        <footer style={{ backgroundColor: rawTheme.footerBackgroundColor }} className="text-white">
          {footerTextLinkSections.length > 0 ? (
            <div className="py-12">
              <div className={`w-full grid ${footerTextLinkSections.length === 1 ? 'grid-cols-2' : 'grid-cols-3'} pb-8`}>
                {/* 左カラム: ロゴとディスクリプション */}
                <div className="text-left px-8">
                  <div className="flex items-center gap-3 mb-4">
                    {rawSiteInfo.faviconUrl && (
                      <Image
                        src={rawSiteInfo.faviconUrl}
                        alt={`${siteInfo.name} アイコン`}
                        width={32}
                        height={32}
                        className="w-8 h-8 brightness-0 invert"
                        unoptimized={rawSiteInfo.faviconUrl.endsWith('.svg')}
                      />
                    )}
                    {rawSiteInfo.logoUrl ? (
                      <Image
                        src={rawSiteInfo.logoUrl}
                        alt={siteInfo.name}
                        width={120}
                        height={32}
                        className="h-8 w-auto brightness-0 invert"
                        unoptimized={rawSiteInfo.logoUrl.endsWith('.svg')}
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
                {footerTextLinkSections.map((section: any, index: number) => {
                  const validLinks = section.links?.filter((link: any) => link.text && link.url) || [];
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
                          {validLinks.map((link: any, linkIndex: number) => (
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
        <ScrollToTopButton primaryColor={rawTheme.primaryColor} />
      </div>
    </>
  );
}

