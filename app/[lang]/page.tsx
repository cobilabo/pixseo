import { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { getMediaIdFromHost, getSiteInfo, getTheme, getPopularArticlesServer, getRecommendedArticlesServer, getRecentArticlesServer } from '@/lib/firebase/cached';
import { getCategoriesServer, getCategoriesWithCountServer } from '@/lib/firebase/categories-server';
import { getTagsServer } from '@/lib/firebase/tags-server';
import { getPopularSearchTagsServer } from '@/lib/firebase/search-log-server';
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
import XLink from '@/components/common/XLink';
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

// ISR: 5分ごとに再生成
export const revalidate = 600;

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
  
  if (!mediaId) {
    return {
      title: 'PixSEO Media',
      description: '',
    };
  }

  const rawSiteInfo = await getSiteInfo(mediaId);
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  
  return {
    title: siteInfo.name,
    description: siteInfo.description || '',
    robots: {
      index: siteInfo.allowIndexing,
      follow: siteInfo.allowIndexing,
    },
    icons: siteInfo.faviconUrl ? {
      icon: siteInfo.faviconUrl,
      apple: siteInfo.faviconUrl,
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
      title: siteInfo.name,
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
  const userAgent = headersList.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);
  
  // すべてのデータを並列取得（homeページチェックも含む）
  const [rawHomePage, rawSiteInfo, rawTheme, recentArticles, popularArticles, recommendedArticles, allCategories, allCategoriesWithCount, allTags, popularSearchTags] = await Promise.all([
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteInfo.name,
    description: siteInfo.description,
    url: `https://${host}/${lang}`,
    inLanguage: LANG_REGIONS[lang],
    potentialAction: {
      '@type': 'SearchAction',
      target: `https://${host}/${lang}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
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

          {/* JSON-LD構造化データ */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          {/* SEO用のh1タグ（視覚的には非表示） */}
          <h1 className="sr-only">{homePage.title}</h1>

          {/* BlockBuilderのみでレンダリング */}
          {rawHomePage.useBlockBuilder && rawHomePage.blocks ? (
            <BlockRenderer blocks={rawHomePage.blocks} isMobile={isMobile} showPanel={false} lang={lang} searchData={{ tags, categories, popularTags: popularSearchTags, mediaId: mediaId || undefined }} />
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
          <BlockRenderer blocks={rawHomePage.blocks} isMobile={isMobile} showPanel={rawHomePage.showPanel !== false} lang={lang} excludeFullWidthSliders searchData={{ tags, categories, popularTags: popularSearchTags, mediaId: mediaId || undefined }} />
        ) : (
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: homePage.content }}
          />
        )}
      </article>
    );

    const themeClass = rawTheme.layoutTheme === 'furatto' ? 'theme-furatto-default' : '';

    return (
      <div className={`min-h-screen ${themeClass}`} style={{ backgroundColor: rawTheme.backgroundColor }}>
        <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />
        {customCss && (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        )}

        {/* JSON-LD構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <MediaHeader
          siteName={siteInfo.name}
          siteInfo={rawSiteInfo}
          menuSettings={theme.menuSettings}
          menuBackgroundColor={rawTheme.menuBackgroundColor}
          menuTextColor={rawTheme.menuTextColor}
          lang={lang}
          layoutTheme={rawTheme.layoutTheme}
        />

        {/* カテゴリーバー / グローバルメニュー */}
        {showGlobalNav && (
          <CategoryBar 
            categories={categories} 
            lang={lang} 
            globalNavItems={rawTheme.menuSettings?.globalNavItems}
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
          className={`relative ${showGlobalNav && !homeHasFullWidthSlider ? '-mt-24 pt-16 md:pt-32' : ''}`}
          style={{ 
            backgroundColor: rawHomePage.backgroundColor || rawTheme.backgroundColor, 
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
                      variant="compact"
                    />
                  )}

                  {/* サイドコンテンツ（設定に基づく） */}
                  <SidebarRenderer
                    sideContentItems={rawTheme.sideContentItems}
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
                  {rawTheme.snsSettings?.xUserId && <XLink username={rawTheme.snsSettings.xUserId} lang={lang} />}
                </aside>
              </div>
            </main>
          ) : (
            // 1カラムレイアウト（サイドバー非表示時）
            <main className={`max-w-4xl mx-auto ${rawHomePage.showPanel !== false ? 'px-4 sm:px-6 lg:px-8 py-12' : ''}`}>
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

      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
      />

      {/* カテゴリーバー / グローバルメニュー */}
      <CategoryBar 
        categories={categories} 
        lang={lang} 
        globalNavItems={rawTheme.menuSettings?.globalNavItems}
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
            {rawTheme.layoutTheme !== 'furatto' && (
              <>
                {/* 新着記事 */}
                <section className="mb-12">
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{t('section.recentArticles', lang)}</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{t('section.recentArticlesEn', lang)}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {localizedRecentArticles.length > 0 ? (
                      localizedRecentArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} lang={lang} />
                      ))
                    ) : (
                      <p className="text-gray-500 col-span-full text-center py-8">
                        {t('message.noArticles', lang)}
                      </p>
                    )}
                  </div>
                </section>

                {/* 人気記事ランキング */}
                <section className="mb-12">
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{t('section.popularArticles', lang)}</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{t('section.popularArticlesEn', lang)}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {localizedPopularArticles.length > 0 ? (
                      localizedPopularArticles.map((article, index) => (
                        <div key={article.id} className="relative">
                          <span className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                            {index + 1}
                          </span>
                          <ArticleCard article={article} lang={lang} />
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 col-span-full text-center py-8">
                        {t('message.noArticles', lang)}
                      </p>
                    )}
                  </div>
                </section>
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
              sideContentItems={rawTheme.sideContentItems}
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
            {rawTheme.snsSettings?.xUserId && <XLink username={rawTheme.snsSettings.xUserId} lang={lang} />}
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
            <FooterTextLinksRenderer sections={footerTextLinkSections} siteInfo={siteInfo} lang={lang} />

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
      </div>

      {/* 上に戻るボタン */}
      <ScrollToTopButton primaryColor={rawTheme.primaryColor} />
    </div>
  );
}

