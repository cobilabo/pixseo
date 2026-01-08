import { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { adminDb } from '@/lib/firebase/admin';
import { getRecentArticlesServer, getPopularArticlesServer, getRecommendedArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getTagsServer } from '@/lib/firebase/tags-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
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
import BlockRenderer from '@/components/blocks/BlockRenderer';
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
export const revalidate = 300;

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

  const [rawSiteInfo] = await Promise.all([
    getSiteInfo(mediaId),
  ]);
  
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
  
  // homeページがあるかチェック
  const rawHomePage = mediaId ? await getHomePage(mediaId) : null;
  
  // サイト設定、Theme、記事を並列取得
  const [rawSiteInfo, rawTheme, recentArticles, popularArticles, recommendedArticles, allCategories, allTags] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getRecentArticlesServer(10, mediaId || undefined),
    getPopularArticlesServer(10, mediaId || undefined),
    getRecommendedArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
    getTagsServer(),
  ]);
  
  // 多言語化
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const categories = allCategories
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => localizeCategory(cat, lang));
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
    const customCss = rawHomePage.customCss || '';

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
          <BlockRenderer blocks={rawHomePage.blocks} isMobile={isMobile} showPanel={rawHomePage.showPanel !== false} lang={lang} />
        ) : (
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: homePage.content }}
          />
        )}
      </article>
    );

    return (
      <div className="min-h-screen" style={{ backgroundColor: rawTheme.backgroundColor }}>
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
        />

        {/* カテゴリーバー（グローバルナビゲーション表示時） */}
        {showGlobalNav && (
          <CategoryBar categories={categories} lang={lang} />
        )}

        {/* メインコンテンツエリア */}
        <div 
          className={`relative ${showGlobalNav ? '-mt-24 pt-16 md:pt-32' : ''}`}
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
                      variant="compact"
                    />
                  )}

                  {/* 人気記事 */}
                  <PopularArticles articles={localizedPopularArticles} categories={allCategories} lang={lang} />

                  {/* おすすめ記事 */}
                  <RecommendedArticles articles={localizedRecommendedArticles} categories={allCategories} lang={lang} />

                  {/* バナーエリア */}
                  {footerBlocks.length > 0 && (
                    <SidebarBanners blocks={footerBlocks} />
                  )}

                  {/* Xリンク */}
                  {rawTheme.snsSettings?.xUserId && <XLink username={rawTheme.snsSettings.xUserId} lang={lang} />}

                  {/* カスタムHTML（ふらっとテーマ専用） */}
                  {rawTheme.layoutTheme === 'furatto' && rawTheme.sideContentHtmlItems && rawTheme.sideContentHtmlItems.length > 0 && (
                    <SidebarCustomHtml items={rawTheme.sideContentHtmlItems} />
                  )}
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
  return (
    <div className="min-h-screen" style={{ backgroundColor: rawTheme.backgroundColor }}>
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
      />

      {/* カテゴリーバー（透明背景・上半分） */}
      <CategoryBar categories={categories} lang={lang} />

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
                />
              </div>
            )}

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
                variant="compact"
              />
            )}

            {/* 人気記事 */}
            <PopularArticles articles={localizedPopularArticles} categories={allCategories} lang={lang} />

            {/* おすすめ記事 */}
            <RecommendedArticles articles={localizedRecommendedArticles} categories={allCategories} lang={lang} />

            {/* バナーエリア */}
            {footerBlocks.length > 0 && (
              <SidebarBanners blocks={footerBlocks} />
            )}

            {/* Xリンク */}
            {rawTheme.snsSettings?.xUserId && <XLink username={rawTheme.snsSettings.xUserId} lang={lang} />}

            {/* カスタムHTML（ふらっとテーマ専用） */}
            {rawTheme.layoutTheme === 'furatto' && rawTheme.sideContentHtmlItems && rawTheme.sideContentHtmlItems.length > 0 && (
              <SidebarCustomHtml items={rawTheme.sideContentHtmlItems} />
            )}
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

