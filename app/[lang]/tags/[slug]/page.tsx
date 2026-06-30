import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import {
  getTagServer,
  getArticlesServer,
  getPopularArticlesServer,
  getRecommendedArticlesServer,
  getRecentArticlesServer,
  getAllCategoriesServer as getCategoriesServer,
  getCategoriesWithCountServer,
  getMediaIdFromHost,
  getSiteInfo,
  getTheme,
  getAllTagsServer as getTagsServer,
  getPopularSearchTagsServer,
  getApprovedPopularKeywordsServer,
} from '@/lib/firebase/cached';
import { getCombinedStyles } from '@/lib/firebase/theme-helper';
import { getSiteOrigin } from '@/lib/site-url';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizeCategory, localizeTag, localizeArticle } from '@/lib/i18n/localize';
import { t } from '@/lib/i18n/translations';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FirstView from '@/components/layout/FirstView';
import ArticleCard from '@/components/articles/ArticleCard';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import SidebarSnsLinks from '@/components/common/SidebarSnsLinks';
import SidebarBanners from '@/components/common/SidebarBanners';
import SidebarRenderer from '@/components/common/SidebarRenderer';
import SearchWidget from '@/components/search/SearchWidget';
import { resolveFeaturedTags } from '@/lib/search/featured-tags';

// ISR: 30分ごとに再生成（記事更新時は revalidatePath で即時反映）
export const revalidate = 1800;

interface PageProps {
  params: {
    lang: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const [rawTag, mediaId] = await Promise.all([
    getTagServer(params.slug),
    getMediaIdFromHost(),
  ]);
  
  if (!rawTag) {
    notFound();
  }

  const taggedArticles = await getArticlesServer({
    tagId: rawTag.id,
    limit: 1,
    mediaId: mediaId || undefined,
  });
  if (taggedArticles.length === 0) {
    notFound();
  }

  const tag = localizeTag(rawTag, lang);
  const rawSiteInfo = mediaId ? await getSiteInfo(mediaId) : { name: 'メディアサイト', name_ja: 'メディアサイト', description: '', logoUrl: '', faviconUrl: undefined, allowIndexing: false, isPreview: false };
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const origin = getSiteOrigin();
  const pageTitle = t('meta.tagListTitle', lang, { name: tag.name });
  const pageDescription = t('meta.tagListDescription', lang, { name: tag.name });

  return {
    title: `${pageTitle} | ${siteInfo.name}`,
    description: pageDescription,
    robots: { index: rawSiteInfo.allowIndexing, follow: rawSiteInfo.allowIndexing },
    icons: rawSiteInfo.faviconUrl ? { icon: rawSiteInfo.faviconUrl, apple: rawSiteInfo.faviconUrl } : undefined,
    alternates: {
      canonical: `${origin}/${lang}/tags/${params.slug}`,
      languages: {
        'ja-JP': `${origin}/ja/tags/${params.slug}`,
        'en-US': `${origin}/en/tags/${params.slug}`,
        'zh-CN': `${origin}/zh/tags/${params.slug}`,
        'ko-KR': `${origin}/ko/tags/${params.slug}`,
        'x-default': `${origin}/ja/tags/${params.slug}`,
      },
    },
    openGraph: {
      title: `${pageTitle} | ${siteInfo.name}`,
      description: pageDescription,
      locale: LANG_REGIONS[lang],
      alternateLocale: SUPPORTED_LANGS.filter(l => l !== lang).map(l => LANG_REGIONS[l]),
    },
  };
}

export default async function TagPage({ params }: PageProps) {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const [rawTag, mediaId] = await Promise.all([
    getTagServer(params.slug),
    getMediaIdFromHost(),
  ]);

  if (!rawTag) notFound();

  const taggedArticlesCheck = await getArticlesServer({
    tagId: rawTag.id,
    limit: 1,
    mediaId: mediaId || undefined,
  });
  if (taggedArticlesCheck.length === 0) {
    notFound();
  }

  const tag = localizeTag(rawTag, lang);

  // hostを取得
  const headersList = headers();
  const host = headersList.get('host') || '';

  const [rawSiteInfo, rawTheme, articles, popularArticles, recommendedArticles, recentArticles, allCategories, allCategoriesWithCount, allTags, popularSearchTags, popularSearchKeywords] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getArticlesServer({ tagId: rawTag.id, limit: 30 }),
    getPopularArticlesServer(10, mediaId || undefined),
    getRecommendedArticlesServer(10, mediaId || undefined),
    getRecentArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
    getCategoriesWithCountServer({ mediaId: mediaId || undefined }),
    getTagsServer(),
    mediaId ? getPopularSearchTagsServer(mediaId, 30, 20) : Promise.resolve([]),
    mediaId ? getApprovedPopularKeywordsServer(mediaId, 0, 50) : Promise.resolve([]),
  ]);
  
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const hasTagFvHeading = Boolean(rawTheme.firstView && theme.firstView?.imageUrl);
  const categories = allCategories.filter(cat => !mediaId || cat.mediaId === mediaId).map(cat => localizeCategory(cat, lang));
  const categoriesWithCount = allCategoriesWithCount
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => ({ ...localizeCategory(cat, lang), articleCount: cat.articleCount }));
  const localizedArticles = articles.map(art => localizeArticle(art, lang));
  const localizedPopularArticles = popularArticles.map(art => localizeArticle(art, lang));
  const localizedRecentArticles = recentArticles.map(art => localizeArticle(art, lang));
  const localizedRecommendedArticles = recommendedArticles.length > 0
    ? recommendedArticles.map(art => localizeArticle(art, lang))
    : localizedPopularArticles;
  
  // タグのローカライズ（SearchWidget用）
  const sidebarTags = allTags
    .filter(tag => !mediaId || tag.mediaId === mediaId)
    .map(tag => ({
      id: tag.id,
      name: (tag as any)[`name_${lang}`] || tag.name,
      slug: tag.slug,
    }));

  const featuredTags = resolveFeaturedTags(
    sidebarTags,
    rawTheme.searchSettings?.featuredTagsSettings?.tagIds
  );
  
  const combinedStyles = getCombinedStyles(rawTheme);
  const footerBlocks = rawTheme.footerBlocks?.filter((block: any) => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];

  // JSON-LD構造化データ（CollectionPage）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${tag.name} - ${siteInfo.name}`,
    description: `${siteInfo.name}の${tag.name}タグの記事一覧`,
    url: `https://${host}/${lang}/tags/${rawTag.slug}`,
    inLanguage: LANG_REGIONS[lang],
    isPartOf: {
      '@type': 'WebSite',
      name: siteInfo.name,
      url: `https://${host}/${lang}`,
    },
    about: {
      '@type': 'Thing',
      name: tag.name,
    },
  };

  const themeClass = rawTheme.layoutTheme === 'furatto' ? 'theme-furatto-default' : '';

  return (
    <div className={`min-h-screen ${themeClass}`} style={{ backgroundColor: rawTheme.backgroundColor }}>
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {rawTheme.firstView && (
        <FirstView settings={theme.firstView} customTitle={tag.name} customSubtitle="TAG" customMeta={t('meta.articlesCount', lang, { count: localizedArticles.length })} showCustomContent={true} />
      )}
      <MediaHeader siteName={siteInfo.name} siteInfo={rawSiteInfo} menuSettings={theme.menuSettings} menuBackgroundColor={rawTheme.menuBackgroundColor} menuTextColor={rawTheme.menuTextColor} lang={lang} layoutTheme={rawTheme.layoutTheme} snsSettings={rawTheme.snsSettings} />
      {/* カテゴリーバー / グローバルメニュー */}
      <CategoryBar 
        categories={categories} 
        variant="half" 
        lang={lang} 
        globalNavItems={theme.menuSettings?.globalNavItems}
        globalMenuDesign={rawTheme.menuSettings?.globalMenuDesign}
        layoutTheme={rawTheme.layoutTheme}
      />

      {/* メインコンテンツエリア以降（背景色付き・前面・カテゴリーパネルの下半分に重なる） */}
      <div className="relative -mt-24 pt-16 md:pt-32" style={{ backgroundColor: rawTheme.backgroundColor, zIndex: 10 }}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 lg:w-[70%]">
            <section>
              {!hasTagFvHeading && (
                <div className="text-center mb-8">
                  <h1 className="text-xl font-bold text-gray-900 mb-1">{tag.name}</h1>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">TAG</p>
                </div>
              )}
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('section.recentArticles', lang)}</h2>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('section.recentArticlesEn', lang)}</p>
              </div>
              {localizedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {localizedArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} lang={lang} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12 flex flex-col items-center justify-center">
                  {rawSiteInfo.faviconUrl ? (
                    <div className="relative w-20 h-20 mb-4 opacity-30"><Image src={rawSiteInfo.faviconUrl} alt="Site Icon" fill className="object-contain" /></div>
                  ) : (
                    <svg className="w-16 h-16 mb-4 opacity-30 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                  <p className="text-sm text-gray-900">このタグの記事はまだありません</p>
                </div>
              )}
            </section>
          </div>
          <aside className="w-full lg:w-[30%] space-y-6">
            {/* 検索ウィジェット（ふらっとテーマ専用・サイドバー表示の場合） */}
            {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.sidebar && (
              <SearchWidget
                searchSettings={rawTheme.searchSettings}
                mediaId={mediaId || undefined}
                lang={lang}
                tags={sidebarTags}
                categories={categories}
                featuredTags={featuredTags}
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
            {footerBlocks.length > 0 && <SidebarBanners blocks={footerBlocks} />}
            <SidebarSnsLinks snsSettings={rawTheme.snsSettings} lang={lang} />
          </aside>
        </div>
      </main>
      {footerContents.length > 0 && <section className="w-full"><FooterContentRenderer contents={footerContents} lang={lang} /></section>}
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
              {siteInfo.description && <p className="text-gray-300 max-w-2xl mx-auto">{siteInfo.description}</p>}
              <p className="text-gray-400 text-sm pt-4">© {new Date().getFullYear()} {siteInfo.name}. All rights reserved.</p>
            </div>
          </div>
        )}
      </footer>
      </div>

      <ScrollToTopButton primaryColor={rawTheme.primaryColor} />
    </div>
  );
}

