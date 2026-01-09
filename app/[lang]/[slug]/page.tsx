import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { adminDb } from '@/lib/firebase/admin';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { getTagsServer } from '@/lib/firebase/tags-server';
import { getCategoriesServer, getCategoriesWithCountServer } from '@/lib/firebase/categories-server';
import { getPopularArticlesServer, getRecommendedArticlesServer } from '@/lib/firebase/articles-server';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizePage, localizeTag, localizeCategory, localizeArticle } from '@/lib/i18n/localize';
import { t } from '@/lib/i18n/translations';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import SearchWidget from '@/components/search/SearchWidget';
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import XLink from '@/components/common/XLink';
import SidebarBanners from '@/components/common/SidebarBanners';
import SidebarCustomHtml from '@/components/common/SidebarCustomHtml';
import SidebarRenderer from '@/components/common/SidebarRenderer';

interface PageProps {
  params: {
    lang: string;
    slug: string;
  };
}

export const revalidate = 60;

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
  const mediaId = await getMediaIdFromHost();
  const headersList = headers();
  const host = headersList.get('host') || '';
  
  if (!mediaId) {
    return { title: 'ページが見つかりません' };
  }

  const rawPage = await getPageBySlug(params.slug, mediaId);
  if (!rawPage) {
    return { title: 'ページが見つかりません' };
  }

  const page = localizePage(rawPage, lang);
  const rawSiteInfo = await getSiteInfo(mediaId);
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

  const rawPage = await getPageBySlug(params.slug, mediaId);
  if (!rawPage) {
    notFound();
  }

  const page = localizePage(rawPage, lang);
  const showGlobalNav = rawPage.showGlobalNav || false;
  const showSidebar = rawPage.showSidebar || false;
  
  // 基本データの取得
  const [rawSiteInfo, rawTheme, allTags, allCategories] = await Promise.all([
    getSiteInfo(mediaId),
    getTheme(mediaId),
    getTagsServer(),
    getCategoriesServer(),
  ]);
  
  // サイドバー表示時のみ記事データを取得
  let popularArticles: any[] = [];
  let recommendedArticles: any[] = [];
  let allCategoriesWithCount: any[] = [];
  if (showSidebar) {
    [popularArticles, recommendedArticles, allCategoriesWithCount] = await Promise.all([
      getPopularArticlesServer(5, mediaId),
      getRecommendedArticlesServer(5, mediaId),
      getCategoriesWithCountServer({ mediaId }),
    ]);
  }
  
  // ローカライズ
  const localizedPopularArticles = popularArticles.map(article => localizeArticle(article, lang));
  const localizedRecommendedArticles = recommendedArticles.map(article => localizeArticle(article, lang));
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

  // カスタムCSS
  const customCss = rawPage.customCss || '';

  // モバイル判定（user-agentから）
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);

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
        <BlockRenderer blocks={rawPage.blocks} isMobile={isMobile} showPanel={rawPage.showPanel !== false} lang={lang} />
      ) : (
        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
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

      <MediaHeader
        siteName={siteInfo.name}
        siteInfo={rawSiteInfo}
        menuSettings={theme.menuSettings}
        menuBackgroundColor={rawTheme.menuBackgroundColor}
        menuTextColor={rawTheme.menuTextColor}
        lang={lang}
      />

      {/* カテゴリーバー / グローバルメニュー */}
      {showGlobalNav && (
        <CategoryBar 
          categories={categories} 
          lang={lang} 
          globalNavItems={rawTheme.menuSettings?.globalNavItems}
        />
      )}

      {/* メインコンテンツエリア */}
      <div 
        className={`relative ${showGlobalNav ? '-mt-24 pt-16 md:pt-32' : ''}`}
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
                    tags={sidebarTags}
                    variant="compact"
                  />
                )}

                {/* サイドコンテンツ（設定に基づく） */}
                <SidebarRenderer
                  sideContentItems={rawTheme.sideContentItems}
                  sideContentHtmlItems={rawTheme.sideContentHtmlItems}
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
          <main className={`max-w-4xl mx-auto ${rawPage.showPanel !== false ? 'px-4 sm:px-6 lg:px-8 py-12' : ''}`}>
            {/* 検索ウィジェット（ふらっとテーマ専用・固定ページ表示の場合） */}
            {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.staticPages && (
              <div className="mb-6">
                <SearchWidget
                  searchSettings={rawTheme.searchSettings}
                  mediaId={mediaId || undefined}
                  lang={lang}
                  tags={sidebarTags}
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

