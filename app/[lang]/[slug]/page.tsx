import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { getMediaIdFromHost, getSiteInfo, getTheme, getPopularArticlesServer, getRecommendedArticlesServer, getRecentArticlesServer } from '@/lib/firebase/cached';
import { SIDEBAR_ARTICLE_FETCH_LIMIT } from '@/lib/constants/sidebar-content';
import { getCombinedStyles } from '@/lib/firebase/theme-helper';
import { getTagsServer } from '@/lib/firebase/tags-server';
import { getPopularSearchTagsServer } from '@/lib/firebase/search-log-server';
import { getCategoriesServer, getCategoriesWithCountServer } from '@/lib/firebase/categories-server';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizePage, localizeTag, localizeCategory, localizeArticle } from '@/lib/i18n/localize';
import { t } from '@/lib/i18n/translations';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import FurattoFooter from '@/components/layout/FurattoFooter';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import BlockRenderer, { hasFullWidthSlider, getFullWidthSliderBlocks, hasFullWidthBottomBlocks, getFullWidthBottomBlocks } from '@/components/blocks/BlockRenderer';
import SliderBlock from '@/components/blocks/SliderBlock';
import HTMLBlock from '@/components/blocks/HTMLBlock';
import SearchWidget from '@/components/search/SearchWidget';
import FurattoMediaSearchHero from '@/components/search/FurattoMediaSearchHero';
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import SidebarSnsLinks from '@/components/common/SidebarSnsLinks';
import SidebarBanners from '@/components/common/SidebarBanners';
import SidebarCustomHtml from '@/components/common/SidebarCustomHtml';
import SidebarRenderer from '@/components/common/SidebarRenderer';

interface PageProps {
  params: {
    lang: string;
    slug: string;
  };
}

export const revalidate = 300;

// 固定ページ取得
async function getPageBySlug(slug: string, mediaId: string) {
  try {
    const pagesSnapshot = await adminDb
      .collection('pages')
      .where('slug', '==', slug)
      .where('mediaId', '==', mediaId)
      .where('isPublished', '==', true)
      .limit(1)
      .get();

    if (pagesSnapshot.empty) {
      return null;
    }

    const doc = pagesSnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      publishedAt: data.publishedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      useBlockBuilder: data.useBlockBuilder || false,
      blocks: data.blocks || [],
    } as any;
  } catch (error) {
    console.error('[getPageBySlug] Error:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const headersList = headers();
  const host = headersList.get('host') || '';
  const mediaId = await getMediaIdFromHost();
  
  if (!mediaId) {
    return { title: 'ページが見つかりません' };
  }

  const [rawPage, rawSiteInfo] = await Promise.all([
    getPageBySlug(params.slug, mediaId),
    getSiteInfo(mediaId),
  ]);
  if (!rawPage) {
    return { title: 'ページが見つかりません' };
  }

  const page = localizePage(rawPage, lang);
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);

  const title = `${page.title} | ${siteInfo.name}`;
  const description = page.metaDescription || page.excerpt || '';

  return {
    title,
    description,
    alternates: {
      canonical: `https://${host}/${lang}/${params.slug}`,
      languages: {
        'ja-JP': `https://${host}/ja/${params.slug}`,
        'en-US': `https://${host}/en/${params.slug}`,
        'zh-CN': `https://${host}/zh/${params.slug}`,
        'ko-KR': `https://${host}/ko/${params.slug}`,
        'x-default': `https://${host}/ja/${params.slug}`,
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

export default async function FixedPage({ params }: PageProps) {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const mediaId = await getMediaIdFromHost();

  if (!mediaId) {
    notFound();
  }

  // mediaId依存の取得を並列化
  const [rawPage, rawSiteInfo, rawTheme, allTags, allCategories, popularSearchTags] = await Promise.all([
    getPageBySlug(params.slug, mediaId),
    getSiteInfo(mediaId),
    getTheme(mediaId),
    getTagsServer(),
    getCategoriesServer(),
    getPopularSearchTagsServer(mediaId, 30, 20),
  ]);
  if (!rawPage) {
    notFound();
  }

  const page = localizePage(rawPage, lang);
  const layoutMode = rawPage.layoutMode || 'default';
  const showGlobalNav = rawPage.showGlobalNav || false;
  const showSidebar = rawPage.showSidebar || false;
  
  // サイドバー表示時のみ記事データを取得
  let popularArticles: any[] = [];
  let recommendedArticles: any[] = [];
  let recentArticles: any[] = [];
  let allCategoriesWithCount: any[] = [];
  if (showSidebar) {
    [popularArticles, recommendedArticles, recentArticles, allCategoriesWithCount] = await Promise.all([
      getPopularArticlesServer(SIDEBAR_ARTICLE_FETCH_LIMIT, mediaId),
      getRecommendedArticlesServer(SIDEBAR_ARTICLE_FETCH_LIMIT, mediaId),
      getRecentArticlesServer(SIDEBAR_ARTICLE_FETCH_LIMIT, mediaId),
      getCategoriesWithCountServer({ mediaId }),
    ]);
  }
  
  // ローカライズ
  const localizedPopularArticles = popularArticles.map(article => localizeArticle(article, lang));
  const localizedRecentArticles = recentArticles.map(article => localizeArticle(article, lang));
  // おすすめ記事（なければ人気記事をフォールバック）
  const localizedRecommendedArticles = recommendedArticles.length > 0
    ? recommendedArticles.map(article => localizeArticle(article, lang))
    : localizedPopularArticles;
  const categories = allCategories
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => localizeCategory(cat, lang));
  const categoriesWithCount = allCategoriesWithCount
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => ({ ...localizeCategory(cat, lang), articleCount: cat.articleCount }));
  
  // サイドバー検索用のタグ一覧（メディアIDでフィルタリング）
  const sidebarTags = allTags
    .filter(tag => !mediaId || tag.mediaId === mediaId)
    .map(tag => localizeTag(tag, lang));

  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const combinedStyles = getCombinedStyles(rawTheme);

  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];
  const footerBlocks = rawTheme.footerBlocks || [];

  // カスタムCSS（インラインまたはStorage参照）
  let customCss = rawPage.customCss || '';
  if (!customCss && rawPage.cssStoragePath) {
    try {
      const bucket = adminStorage.bucket();
      const [contents] = await bucket.file(rawPage.cssStoragePath).download();
      customCss = contents.toString('utf-8');
    } catch { /* CSS読み込み失敗はスキップ */ }
  }

  // モバイル判定（user-agentから）
  const headersList2 = headers();
  const userAgent = headersList2.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);

  const cssLinks: string[] = rawPage.cssLinks || [];

  // 完全白紙モードの場合は、ヘッダー/フッターなしで表示
  if (layoutMode === 'blank') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />
        {customCss && (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        )}
        {cssLinks.map((href: string, i: number) => (
          <link key={i} rel="stylesheet" href={href} />
        ))}
        {/* SEO用のh1タグ（視覚的には非表示） */}
        <h1 className="sr-only">{page.title}</h1>
        
        {/* BlockBuilderのみでレンダリング */}
        {rawPage.useBlockBuilder && rawPage.blocks ? (
          <BlockRenderer blocks={rawPage.blocks} isMobile={isMobile} showPanel={false} lang={lang} layoutTheme={rawTheme.layoutTheme} searchData={{ tags: sidebarTags, categories, popularTags: popularSearchTags, mediaId: mediaId || undefined }} />
        ) : (
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}
        
        <ScrollToTopButton />
      </>
    );
  }

  const pageBlocks = rawPage.blocks || [];
  const pageHasFullWidthSlider = rawPage.useBlockBuilder && hasFullWidthSlider(pageBlocks);
  const pageFullWidthSliders = pageHasFullWidthSlider ? getFullWidthSliderBlocks(pageBlocks) : [];
  const pageHasFullWidthBottom = rawPage.useBlockBuilder && hasFullWidthBottomBlocks(pageBlocks);
  const pageFullWidthBottomBlocks = pageHasFullWidthBottom ? getFullWidthBottomBlocks(pageBlocks) : [];

  // メインコンテンツのレンダリング
  const renderMainContent = () => (
    <article 
      className={rawPage.showPanel !== false ? 'bg-white rounded-lg shadow-md p-8' : ''}
      style={{
        backgroundColor: rawPage.showPanel !== false ? (rawPage.panelColor || '#ffffff') : 'transparent',
        color: rawPage.textColor || undefined,
      }}
    >
      {/* SEO用のh1タグ（視覚的には非表示） */}
      <h1 className="sr-only">{page.title}</h1>
      
      {/* ブロックビルダー使用時はBlockRendererで表示 */}
      {rawPage.useBlockBuilder && rawPage.blocks ? (
        <BlockRenderer blocks={(rawTheme.layoutTheme === 'furatto' && params.slug === 'media') ? rawPage.blocks.filter((b: any) => b.type !== 'search') : rawPage.blocks} isMobile={isMobile} showPanel={rawPage.showPanel !== false} lang={lang} layoutTheme={rawTheme.layoutTheme} excludeFullWidthSliders excludeFullWidthBottomBlocks searchData={{ tags: sidebarTags, categories, popularTags: popularSearchTags, mediaId: mediaId || undefined }} />
      ) : (
        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
    </article>
  );

  const themeClass = rawTheme.layoutTheme === 'furatto' ? 'theme-furatto-default' : rawTheme.layoutTheme === 'cobi' ? 'theme-cobi' : '';

  return (
    <div className={`min-h-screen ${themeClass}`} style={{ backgroundColor: rawTheme.backgroundColor }}>
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />
      {customCss && (
        <style dangerouslySetInnerHTML={{ __html: customCss }} />
      )}

      <MediaHeader
        siteName={siteInfo.name}
        siteInfo={rawSiteInfo}
        menuSettings={theme.menuSettings}
        menuBackgroundColor={rawTheme.menuBackgroundColor}
        menuTextColor={rawTheme.menuTextColor}
        lang={lang}
        layoutTheme={rawTheme.layoutTheme}
        snsSettings={rawTheme.snsSettings}
      />

      {/* カテゴリーバー / グローバルメニュー */}
      {showGlobalNav && (
        <CategoryBar 
          categories={categories} 
          lang={lang} 
          globalNavItems={theme.menuSettings?.globalNavItems}
          globalMenuDesign={rawTheme.menuSettings?.globalMenuDesign}
          layoutTheme={rawTheme.layoutTheme}
        />
      )}

      {/* ふらっとテーマ メディアページ: 検索ヒーロー + スライダーをグラデーションで統合 */}
      {rawTheme.layoutTheme === 'furatto' && params.slug === 'media' ? (
        <section className="furatto-media-search-hero relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300" />
          {/* PC: 1行KEYWORD */}
          <div className="absolute inset-x-0 bottom-0 hidden sm:flex items-start justify-center pointer-events-none select-none overflow-hidden" aria-hidden="true" style={{ top: '0%' }}>
            <span className="furatto-media-search-watermark text-white/[0.15] font-black tracking-widest whitespace-nowrap">
              KEYWORD
            </span>
          </div>
          {/* SP: KEY/WORD 2行 */}
          <div className="absolute inset-0 flex sm:hidden flex-col items-center justify-start pointer-events-none select-none overflow-hidden" aria-hidden="true" style={{ paddingTop: '8%' }}>
            <span className="furatto-wm-key text-white/[0.12] font-black tracking-widest leading-none">KEY</span>
            <span className="furatto-wm-word text-white/[0.12] font-black tracking-widest leading-none" style={{ marginTop: '-0.02em' }}>WORD</span>
          </div>

          <FurattoMediaSearchHero
            lang={lang}
            tags={sidebarTags}
            categories={categories}
            noBackground
          />

          {pageFullWidthSliders.length > 0 && (
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
              {pageFullWidthSliders.map(block => (
                <div key={block.id}>
                  <SliderBlock block={block} lang={lang} />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* fullWidthTop スライダー（ヘッダー直下・横幅いっぱい） */}
          {pageFullWidthSliders.map(block => (
            <div key={block.id} className="relative" style={{ zIndex: 10 }}>
              <SliderBlock block={block} lang={lang} />
            </div>
          ))}
        </>
      )}

      {/* メインコンテンツエリア */}
      <div 
        className={`relative ${showGlobalNav && !pageHasFullWidthSlider ? '-mt-24 pt-16 md:pt-32' : ''}`}
        style={{ 
          backgroundColor: rawPage.backgroundColor || rawTheme.backgroundColor, 
          zIndex: 10 
        }}
      >
        {showSidebar ? (
          // 2カラムレイアウト（サイドバー表示時）
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* メインコンテンツ（70%） */}
              <div className="w-full lg:w-[70%]">
                {/* 検索ウィジェット（ふらっとテーマ専用・固定ページ表示の場合・メインコンテンツ側） */}
                {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.staticPages && !rawTheme.searchSettings?.displayPages?.sidebar && (
                  <div className="mb-6">
                    <SearchWidget
                      searchSettings={rawTheme.searchSettings}
                      mediaId={mediaId || undefined}
                      lang={lang}
                      tags={sidebarTags}
                      categories={categories}
                      popularTags={popularSearchTags}
                    />
                  </div>
                )}
                {renderMainContent()}
              </div>

              {/* サイドバー（30%） */}
              <aside className="w-full lg:w-[30%] space-y-6">
                {/* 検索ウィジェット（ふらっとテーマ専用・サイドバー表示の場合） */}
                {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.sidebar && (
                  <div className={params.slug === 'media' ? 'hidden lg:block' : ''}>
                    <SearchWidget
                      searchSettings={rawTheme.searchSettings}
                      mediaId={mediaId || undefined}
                      lang={lang}
                      tags={sidebarTags}
                      categories={categories}
                      popularTags={popularSearchTags}
                      variant="compact"
                    />
                  </div>
                )}

                {/* サイドコンテンツ（設定に基づく） */}
                <SidebarRenderer
                  sideContentItems={theme.sideContentItems ?? rawTheme.sideContentItems}
                  sideContentHtmlItems={rawTheme.sideContentHtmlItems}
                  recentArticles={localizedRecentArticles}
                  popularArticles={localizedPopularArticles}
                  recommendedArticles={localizedRecommendedArticles}
                  categories={categoriesWithCount}
                  lang={lang}
                />

                {/* バナーエリア */}
                {footerBlocks.length > 0 && (
                  <SidebarBanners blocks={footerBlocks} />
                )}

                {/* Xリンク */}
                <SidebarSnsLinks snsSettings={rawTheme.snsSettings} lang={lang} />
              </aside>
            </div>
          </main>
        ) : (
          // 1カラムレイアウト（サイドバー非表示時）
          <main className={rawPage.showPanel !== false ? 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12' : ''}>
            {/* 検索ウィジェット（ふらっとテーマ専用・固定ページ表示の場合） */}
            {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.staticPages && (
              <div className="mb-6">
                <SearchWidget
                  searchSettings={rawTheme.searchSettings}
                  mediaId={mediaId || undefined}
                  lang={lang}
                  tags={sidebarTags}
                  categories={categories}
                />
              </div>
            )}
            {renderMainContent()}
          </main>
        )}

        {/* フルワイド底部ブロック（サイドバーの外・横幅いっぱい） */}
        {pageFullWidthBottomBlocks.map(block => (
          <div key={block.id} className="w-full">
            <HTMLBlock block={block} lang={lang} />
          </div>
        ))}

        {footerContents.length > 0 && (
          <section className="w-full">
            <FooterContentRenderer contents={footerContents} lang={lang} />
          </section>
        )}

        {rawTheme.layoutTheme === 'furatto' ? (
          <FurattoFooter
            siteInfo={siteInfo}
            menuSettings={rawTheme.menuSettings}
            categories={categories}
            lang={lang}
            footerBackgroundColor={rawTheme.footerBackgroundColor}
          />
        ) : (
        <footer style={{ backgroundColor: rawTheme.footerBackgroundColor }} className="text-white">
          {footerTextLinkSections.length > 0 ? (
            <div className="py-12">
              <FooterTextLinksRenderer
                siteInfo={siteInfo}
                sections={footerTextLinkSections}
                lang={lang}
                layoutTheme={rawTheme.layoutTheme}
              />
              <div className="w-full border-t border-gray-700 pt-6">
                <p className="text-gray-400 text-sm text-center">
                  © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-12">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold">{siteInfo.name}</h3>
                {siteInfo.description && (
                  <p className="text-gray-300 max-w-2xl mx-auto">{siteInfo.description}</p>
                )}
                <p className="text-gray-400 text-sm pt-4">
                  © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
                </p>
              </div>
            </div>
          )}
        </footer>
        )}
      </div>

      <ScrollToTopButton primaryColor={rawTheme.primaryColor} />
    </div>
  );
}

