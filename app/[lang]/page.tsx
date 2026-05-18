import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import {
  getMediaIdFromHost,
  getSiteInfo,
  getTheme,
  getPopularArticlesServer,
  getRecommendedArticlesServer,
  getRecentArticlesServer,
  getAllCategoriesServer as getCategoriesServer,
  getCategoriesWithCountServer,
  getAllTagsServer as getTagsServer,
  getPopularSearchTagsServer,
  getApprovedPopularKeywordsServer,
} from '@/lib/firebase/cached';
import { getCombinedStyles } from '@/lib/firebase/theme-helper';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FirstView from '@/components/layout/FirstView';
import ArticleCard from '@/components/articles/ArticleCard';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import SidebarSnsLinks from '@/components/common/SidebarSnsLinks';
import SidebarBanners from '@/components/common/SidebarBanners';
import SearchWidget from '@/components/search/SearchWidget';
import SidebarCustomHtml from '@/components/common/SidebarCustomHtml';
import SidebarRenderer from '@/components/common/SidebarRenderer';
import BlockRenderer, { hasFullWidthSlider, getFullWidthSliderBlocks } from '@/components/blocks/BlockRenderer';
import SliderBlock from '@/components/blocks/SliderBlock';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizeCategory, localizeArticle, localizeTag, localizePage } from '@/lib/i18n/localize';
import { t } from '@/lib/i18n/translations';
import { Page } from '@/types/page';
import { shouldReturn404ForMissingTenant } from '@/lib/firebase/media-tenant-helper';

// homeスラッグの固定ページを取得
async function getHomePage(mediaId: string): Promise<Page | null> {
  try {
    const pagesSnapshot = await adminDb
      .collection('pages')
      .where('slug', '==', 'home')
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
    } as Page;
  } catch (error) {
    console.error('[getHomePage] Error:', error);
    return null;
  }
}

interface PageProps {
  params: {
    lang: string;
  };
}

// ISR: 30分ごとに再生成（記事更新時は revalidatePath で即時反映）
export const revalidate = 1800;

// 全言語パスを事前生成
export async function generateStaticParams() {
  return SUPPORTED_LANGS.map(lang => ({
    lang,
  }));
}

// 動的にメタデータを生成
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const mediaId = await getMediaIdFromHost();
  const headersList = headers();
  const host = headersList.get('host') || '';

  if (shouldReturn404ForMissingTenant(host, mediaId)) {
    notFound();
  }

  if (!mediaId) {
    return {
      title: 'PixSEO Media',
      description: '',
    };
  }

  const [rawSiteInfo, rawHomePage] = await Promise.all([
    getSiteInfo(mediaId),
    getHomePage(mediaId),
  ]);
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const homePage = rawHomePage ? localizePage(rawHomePage, lang) : null;

  // 完全白紙モードでホームページの title が入力されている場合は、
  // サイト名ではなくページタイトルをそのままタイトルとして使用する
  const isHomeBlankMode = (rawHomePage?.layoutMode || 'default') === 'blank';
  const pageTitle = isHomeBlankMode && homePage?.title ? homePage.title : siteInfo.name;

  // ホームページ個別にファビコンが設定されていればそれを優先、なければサイト共通のファビコン
  const resolvedFaviconUrl = rawHomePage?.faviconUrl || siteInfo.faviconUrl;

  return {
    title: pageTitle,
    description: siteInfo.description || '',
    robots: {
      index: siteInfo.allowIndexing,
      follow: siteInfo.allowIndexing,
    },
    icons: resolvedFaviconUrl ? {
      icon: resolvedFaviconUrl,
      apple: resolvedFaviconUrl,
    } : undefined,
    alternates: {
      canonical: `https://${host}/${lang}`,
      languages: {
        'ja-JP': `https://${host}/ja`,
        'en-US': `https://${host}/en`,
        'zh-CN': `https://${host}/zh`,
        'ko-KR': `https://${host}/ko`,
        'x-default': `https://${host}/ja`,
      },
    },
    openGraph: {
      title: pageTitle,
      description: siteInfo.description || '',
      locale: LANG_REGIONS[lang],
      alternateLocale: SUPPORTED_LANGS.filter(l => l !== lang).map(l => LANG_REGIONS[l]),
      images: siteInfo.ogImageUrl ? [siteInfo.ogImageUrl] : undefined,
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  
  // mediaIdを取得
  const mediaId = await getMediaIdFromHost();
  const headersList = headers();
  const host = headersList.get('host') || '';

  if (shouldReturn404ForMissingTenant(host, mediaId)) {
    notFound();
  }

  const userAgent = headersList.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);
  
  // すべてのデータを並列取得（homeページチェックも含む）
  // 注: popularKeywords の集計期間/件数はテーマ設定から取得するが、Promise.all 内では未取得のため
  //     ここでは広めの集計期間/件数で取得し、SearchWidget 側で displayCount に切り詰める。
  const [rawHomePage, rawSiteInfo, rawTheme, recentArticles, popularArticles, recommendedArticles, allCategories, allCategoriesWithCount, allTags, popularSearchTags, popularSearchKeywords] = await Promise.all([
    mediaId ? getHomePage(mediaId) : Promise.resolve(null),
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getRecentArticlesServer(10, mediaId || undefined),
    getPopularArticlesServer(10, mediaId || undefined),
    getRecommendedArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
    getCategoriesWithCountServer({ mediaId: mediaId || undefined }),
    getTagsServer(),
    mediaId ? getPopularSearchTagsServer(mediaId, 30, 20) : Promise.resolve([]),
    mediaId ? getApprovedPopularKeywordsServer(mediaId, 0, 50) : Promise.resolve([]),
  ]);
  
  // 多言語化
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const categories = allCategories
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => localizeCategory(cat, lang));
  const categoriesWithCount = allCategoriesWithCount
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => ({ ...localizeCategory(cat, lang), articleCount: cat.articleCount }));
  const tags = allTags
    .filter(tag => !mediaId || tag.mediaId === mediaId)
    .map(tag => localizeTag(tag, lang));
  
  // 記事も多言語化
  const localizedRecentArticles = recentArticles.map(article => localizeArticle(article, lang));
  const localizedPopularArticles = popularArticles.map(article => localizeArticle(article, lang));
  // おすすめ記事（おすすめカテゴリーに属する記事、なければ最近の記事をフォールバック）
  const localizedRecommendedArticles = recommendedArticles.length > 0
    ? recommendedArticles.map(article => localizeArticle(article, lang))
    : localizedRecentArticles;
  
  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(rawTheme);
  
  // フッターブロックを取得（themeから）
  const footerBlocks = theme.footerBlocks?.filter((block: any) => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];

  // JSON-LD 構造化データ（WebSite）
  const siteOrigin = `https://${host}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteInfo.name,
    description: siteInfo.description,
    url: `${siteOrigin}/${lang}`,
    inLanguage: LANG_REGIONS[lang],
    publisher: { '@id': `${siteOrigin}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteOrigin}/${lang}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  // Organization スキーマ（記事ページの publisher と同じ @id を使い、再利用可能な参照に）
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteOrigin}/#organization`,
    name: siteInfo.name,
    url: siteOrigin,
    ...(rawSiteInfo.logoUrl ? { logo: rawSiteInfo.logoUrl } : {}),
    ...(rawSiteInfo.ogImageUrl ? { image: rawSiteInfo.ogImageUrl } : {}),
  };

  // homeページが存在する場合は固定ページを表示
  if (rawHomePage) {
    const homePage = localizePage(rawHomePage, lang);
    const showGlobalNav = rawHomePage.showGlobalNav || false;
    const showSidebar = rawHomePage.showSidebar || false;
    let customCss = rawHomePage.customCss || '';
    if (!customCss && rawHomePage.cssStoragePath) {
      try {
        const bucket = adminStorage.bucket();
        const [contents] = await bucket.file(rawHomePage.cssStoragePath).download();
        customCss = contents.toString('utf-8');
      } catch { /* CSS読み込み失敗はスキップ */ }
    }
    const layoutMode = rawHomePage.layoutMode || 'default';

    // 完全白紙モードの場合は、ヘッダー/フッターなしで表示（[slug]/page.tsxと同一の処理）
    const homeCssLinks: string[] = (rawHomePage as any).cssLinks || [];

    if (layoutMode === 'blank') {
      return (
        <>
          <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />
          {customCss && (
            <style dangerouslySetInnerHTML={{ __html: customCss }} />
          )}
          {homeCssLinks.map((href: string, i: number) => (
            <link key={i} rel="stylesheet" href={href} />
          ))}

          {/* JSON-LD構造化データ: WebSite + Organization */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />

          {/* SEO用のh1タグ（視覚的には非表示） */}
          <h1 className="sr-only">{homePage.title}</h1>

          {/* BlockBuilderのみでレンダリング */}
          {rawHomePage.useBlockBuilder && rawHomePage.blocks ? (
            <BlockRenderer blocks={rawHomePage.blocks} isMobile={isMobile} showPanel={false} lang={lang} layoutTheme={rawTheme.layoutTheme} searchData={{ tags, categories, popularTags: popularSearchTags, popularKeywords: popularSearchKeywords, mediaId: mediaId || undefined }} />
          ) : (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: homePage.content }}
            />
          )}

          <ScrollToTopButton />
        </>
      );
    }

    const homeBlocks = rawHomePage.blocks || [];
    const homeHasFullWidthSlider = rawHomePage.useBlockBuilder && hasFullWidthSlider(homeBlocks);
    const homeFullWidthSliders = homeHasFullWidthSlider ? getFullWidthSliderBlocks(homeBlocks) : [];

    // メインコンテンツのレンダリング
    const renderMainContent = () => (
      <article 
        className={rawHomePage.showPanel !== false ? 'bg-white rounded-lg shadow-md p-8' : ''}
        style={{
          backgroundColor: rawHomePage.showPanel !== false ? (rawHomePage.panelColor || '#ffffff') : 'transparent',
          color: rawHomePage.textColor || undefined,
        }}
      >
        {/* SEO用のh1タグ（視覚的には非表示） */}
        <h1 className="sr-only">{homePage.title}</h1>
        
        {/* ブロックビルダー使用時はBlockRendererで表示 */}
        {rawHomePage.useBlockBuilder && rawHomePage.blocks ? (
          <BlockRenderer blocks={rawHomePage.blocks} isMobile={isMobile} showPanel={rawHomePage.showPanel !== false} lang={lang} layoutTheme={rawTheme.layoutTheme} excludeFullWidthSliders searchData={{ tags, categories, popularTags: popularSearchTags, popularKeywords: popularSearchKeywords, mediaId: mediaId || undefined }} />
        ) : (
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: homePage.content }}
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

        {/* JSON-LD構造化データ: WebSite + Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />

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

        {/* カテゴリーバー / グローバルメニュー（cobi ホームでは非表示） */}
        {showGlobalNav && rawTheme.layoutTheme !== 'cobi' && (
          <CategoryBar 
            categories={categories} 
            lang={lang} 
            globalNavItems={theme.menuSettings?.globalNavItems}
            globalMenuDesign={rawTheme.menuSettings?.globalMenuDesign}
            layoutTheme={rawTheme.layoutTheme}
          />
        )}

        {/* fullWidthTop スライダー（ヘッダー直下・横幅いっぱい） */}
        {homeFullWidthSliders.map(block => (
          <div key={block.id} className="relative" style={{ zIndex: 10 }}>
            <SliderBlock block={block} lang={lang} />
          </div>
        ))}

        {/* メインコンテンツエリア */}
        <div 
          className={`relative ${showGlobalNav && rawTheme.layoutTheme !== 'cobi' && !homeHasFullWidthSlider ? '-mt-24 pt-16 md:pt-32' : ''}`}
          style={{ 
            backgroundColor: rawHomePage.showPanel !== false ? (rawHomePage.backgroundColor || rawTheme.backgroundColor) : 'transparent', 
            zIndex: 10 
          }}
        >
          {showSidebar ? (
            // 2カラムレイアウト（サイドバー表示時）
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* メインコンテンツ（70%） */}
                <div className="w-full lg:w-[70%]">
                  {/* 検索ウィジェット（ふらっとテーマ専用） */}
                  {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.topPage && !rawTheme.searchSettings?.displayPages?.sidebar && (
                    <div className="mb-6">
                      <SearchWidget
                        searchSettings={rawTheme.searchSettings}
                        mediaId={mediaId || undefined}
                        lang={lang}
                        tags={tags}
                        categories={categories}
                        popularTags={popularSearchTags}
                        popularKeywords={popularSearchKeywords}
                      />
                    </div>
                  )}
                  {renderMainContent()}
                </div>

                {/* サイドバー（30%） */}
                <aside className="w-full lg:w-[30%] space-y-6">
                  {/* 検索ウィジェット（ふらっとテーマ専用・サイドバー表示の場合） */}
                  {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.sidebar && (
                    <SearchWidget
                      searchSettings={rawTheme.searchSettings}
                      mediaId={mediaId || undefined}
                      lang={lang}
                      tags={tags}
                      categories={categories}
                      popularTags={popularSearchTags}
                      popularKeywords={popularSearchKeywords}
                      variant="compact"
                    />
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
            <main className={rawHomePage.showPanel !== false ? 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12' : ''}>
              {/* 検索ウィジェット（ふらっとテーマ専用） */}
              {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.topPage && (
                <div className="mb-6">
                  <SearchWidget
                    searchSettings={rawTheme.searchSettings}
                    mediaId={mediaId || undefined}
                    lang={lang}
                    tags={tags}
                    categories={categories}
                  />
                </div>
              )}
              {renderMainContent()}
            </main>
          )}

          {footerContents.length > 0 && (
            <section className="w-full">
              <FooterContentRenderer contents={footerContents} lang={lang} />
            </section>
          )}

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
              <div className="max-w-7xl mx-auto px-0 py-12">
                <div className="text-center space-y-4">
                  <p className="text-2xl font-bold">{siteInfo.name}</p>
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
        </div>

        <ScrollToTopButton primaryColor={rawTheme.primaryColor} />
      </div>
    );
  }

  // homeページがない場合は従来のトップページを表示
  const fallbackThemeClass = rawTheme.layoutTheme === 'furatto' ? 'theme-furatto-default' : '';
  return (
    <div className={`min-h-screen ${fallbackThemeClass}`} style={{ backgroundColor: rawTheme.backgroundColor }}>
      {/* Themeスタイル注入 */}
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* JSON-LD構造化データ: WebSite + Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* FV（ファーストビュー）- 最上部に配置 */}
      {rawTheme.firstView && (
        <FirstView settings={theme.firstView} />
      )}

      {/* ヘッダー - FVの上に重ねる */}
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
      <CategoryBar 
        categories={categories} 
        lang={lang} 
        globalNavItems={theme.menuSettings?.globalNavItems}
        globalMenuDesign={rawTheme.menuSettings?.globalMenuDesign}
        layoutTheme={rawTheme.layoutTheme}
      />

      {/* メインコンテンツエリア以降（背景色付き・前面・カテゴリーパネルの下半分に重なる） */}
      <div className="relative -mt-24 pt-16 md:pt-32" style={{ backgroundColor: rawTheme.backgroundColor, zIndex: 10 }}>

        {/* メインコンテンツ - 2カラムレイアウト */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* メインカラム（70%） */}
          <div className="flex-1 lg:w-[70%]">
            {/* 検索ウィジェット（ふらっとテーマ専用・TOPページ表示の場合） */}
            {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.topPage && (
              <div className="mb-8">
                <SearchWidget
                  searchSettings={rawTheme.searchSettings}
                  mediaId={mediaId || undefined}
                  lang={lang}
                  tags={tags}
                  categories={categories}
                />
              </div>
            )}

            {/* 記事一覧（Cobiテーマのみ表示） */}
            {/* SEO: 配列が空のときはセクションごと非表示にする（empty state を初期 HTML に焼き込まない） */}
            {rawTheme.layoutTheme !== 'furatto' && (
              <>
                {/* 新着記事 */}
                {localizedRecentArticles.length > 0 && (
                  <section className="mb-12">
                    <div className="text-center mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">{t('section.recentArticles', lang)}</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{t('section.recentArticlesEn', lang)}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {localizedRecentArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} lang={lang} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 人気記事ランキング */}
                {localizedPopularArticles.length > 0 && (
                  <section className="mb-12">
                    <div className="text-center mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">{t('section.popularArticles', lang)}</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{t('section.popularArticlesEn', lang)}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {localizedPopularArticles.map((article, index) => (
                        <div key={article.id} className="relative">
                          <span className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                            {index + 1}
                          </span>
                          <ArticleCard article={article} lang={lang} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* サイドバー（30%） */}
          <aside className="w-full lg:w-[30%] space-y-6">
            {/* 検索ウィジェット（ふらっとテーマ専用・サイドバー表示の場合） */}
            {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.sidebar && (
              <SearchWidget
                searchSettings={rawTheme.searchSettings}
                mediaId={mediaId || undefined}
                lang={lang}
                tags={tags}
                categories={categories}
                variant="compact"
              />
            )}

            {/* サイドコンテンツ（設定に基づく） */}
            <SidebarRenderer
              sideContentItems={theme.sideContentItems ?? rawTheme.sideContentItems}
              sideContentHtmlItems={rawTheme.sideContentHtmlItems}
              recentArticles={localizedRecentArticles}
              popularArticles={localizedPopularArticles}
              recommendedArticles={localizedRecommendedArticles}
              categories={rawTheme.layoutTheme === 'furatto' ? [] : categoriesWithCount}
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

      {/* フッターコンテンツ（画面横いっぱい） */}
      {footerContents.length > 0 && (
        <section className="w-full">
          <FooterContentRenderer contents={footerContents} lang={lang} />
        </section>
      )}

      {/* フッター */}
      <footer style={{ backgroundColor: rawTheme.footerBackgroundColor }} className="text-white">
        {footerTextLinkSections.length > 0 ? (
          <div className="py-12">
            <FooterTextLinksRenderer sections={footerTextLinkSections} siteInfo={siteInfo} lang={lang} layoutTheme={rawTheme.layoutTheme} />

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
              <p className="text-2xl font-bold">{siteInfo.name}</p>
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

      {/* 上に戻るボタン */}
      <ScrollToTopButton primaryColor={rawTheme.primaryColor} />
    </div>
  );
}

