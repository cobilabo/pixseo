import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getWriterServer, getArticlesByWriterServer, getPopularArticlesServer, getRecommendedArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer as getAllCategoriesServer, getCategoriesWithCountServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizeCategory, localizeWriter, localizeArticle } from '@/lib/i18n/localize';
import { t } from '@/lib/i18n/translations';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FirstView from '@/components/layout/FirstView';
import ArticleCard from '@/components/articles/ArticleCard';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import XLink from '@/components/common/XLink';
import SidebarBanners from '@/components/common/SidebarBanners';
import SidebarRenderer from '@/components/common/SidebarRenderer';
import SearchWidget from '@/components/search/SearchWidget';
import { getTagsServer } from '@/lib/firebase/tags-server';
import { getPopularSearchTagsServer } from '@/lib/firebase/search-log-server';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    lang: string;
    id: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const mediaId = await getMediaIdFromHost();
  const rawWriter = await getWriterServer(params.id);
  
  if (!rawWriter) {
    return { title: 'ライターが見つかりません', robots: { index: false, follow: false } };
  }

  const writer = localizeWriter(rawWriter, lang);
  const rawSiteInfo = mediaId ? await getSiteInfo(mediaId) : { allowIndexing: false, isPreview: false, name: 'メディアサイト', name_ja: 'メディアサイト', description: '', logoUrl: '', faviconUrl: undefined };
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  
  const headersList = headers();
  const host = headersList.get('host') || '';
  const canonicalUrl = `https://${host}/${lang}/writers/${rawWriter.id}`;

  return {
    title: `${writer.handleName} | ${siteInfo.name}`,
    description: writer.bio || `${writer.handleName}の記事一覧`,
    robots: { index: rawSiteInfo.allowIndexing, follow: rawSiteInfo.allowIndexing },
    icons: rawSiteInfo.faviconUrl ? { icon: rawSiteInfo.faviconUrl, apple: rawSiteInfo.faviconUrl } : undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'ja-JP': `https://${host}/ja/writers/${rawWriter.id}`,
        'en-US': `https://${host}/en/writers/${rawWriter.id}`,
        'zh-CN': `https://${host}/zh/writers/${rawWriter.id}`,
        'ko-KR': `https://${host}/ko/writers/${rawWriter.id}`,
        'x-default': `https://${host}/ja/writers/${rawWriter.id}`,
      },
    },
    openGraph: {
      title: `${writer.handleName} | ${siteInfo.name}`,
      description: writer.bio || `${writer.handleName}の記事一覧`,
      url: canonicalUrl,
      siteName: siteInfo.name,
      locale: LANG_REGIONS[lang],
      alternateLocale: SUPPORTED_LANGS.filter(l => l !== lang).map(l => LANG_REGIONS[l]),
      images: rawWriter.icon ? [{ url: rawWriter.icon, width: 400, height: 400, alt: writer.handleName }] : [],
    },
  };
}

export default async function WriterPage({ params }: PageProps) {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const mediaId = await getMediaIdFromHost();
  const rawWriter = await getWriterServer(params.id);
  if (!rawWriter) notFound();

  const writer = localizeWriter(rawWriter, lang);
  const headersList = headers();
  const host = headersList.get('host') || '';

  const [rawSiteInfo, rawTheme, articles, allCategories, allCategoriesWithCount, popularArticles, recommendedArticles, allTags, popularSearchTags] = await Promise.all([
    mediaId ? getSiteInfo(mediaId) : Promise.resolve({ name: 'メディアサイト', name_ja: 'メディアサイト', description: '', logoUrl: '', faviconUrl: '', allowIndexing: false, isPreview: false }),
    mediaId ? getTheme(mediaId) : Promise.resolve({} as any),
    getArticlesByWriterServer(params.id, mediaId || undefined),
    getAllCategoriesServer(),
    getCategoriesWithCountServer({ mediaId: mediaId || undefined }),
    getPopularArticlesServer(10, mediaId || undefined),
    getRecommendedArticlesServer(10, mediaId || undefined),
    getTagsServer(),
    mediaId ? getPopularSearchTagsServer(mediaId, 30, 20) : Promise.resolve([]),
  ]);

  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const headerCategories = mediaId ? allCategories.filter(cat => cat.mediaId === mediaId).map(cat => localizeCategory(cat, lang)) : allCategories.map(cat => localizeCategory(cat, lang));
  const categoriesWithCount = allCategoriesWithCount
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => ({ ...localizeCategory(cat, lang), articleCount: cat.articleCount }));
  const localizedArticles = articles.map(art => localizeArticle(art, lang));
  const localizedPopularArticles = popularArticles.map(art => localizeArticle(art, lang));
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

  const combinedStyles = getCombinedStyles(rawTheme);
  const footerBlocks = rawTheme.footerBlocks?.filter((block: any) => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: writer.handleName,
    url: `https://${host}/${lang}/writers/${rawWriter.id}`,
    image: rawWriter.icon || '',
    description: writer.bio || '',
    inLanguage: LANG_REGIONS[lang],
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: rawTheme.backgroundColor || '#f9fafb' }}>
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {rawTheme.firstView && (
        <FirstView settings={{ imageUrl: rawWriter.backgroundImage || '', catchphrase: '', description: '' }} writerIcon={rawWriter.icon} customTitle={writer.handleName} customSubtitle="" customMeta={t('meta.articlesCount', lang, { count: localizedArticles.length })} showCustomContent={true} />
      )}

      <MediaHeader siteName={siteInfo.name} siteInfo={rawSiteInfo} menuSettings={theme.menuSettings} menuBackgroundColor={rawTheme.menuBackgroundColor} menuTextColor={rawTheme.menuTextColor} lang={lang} />
      {/* カテゴリーバー / グローバルメニュー */}
      <CategoryBar 
        categories={headerCategories} 
        variant="half" 
        lang={lang} 
        globalNavItems={rawTheme.menuSettings?.globalNavItems}
      />

      {/* メインコンテンツエリア以降（背景色付き・前面・カテゴリーパネルの下半分に重なる） */}
      <div className="relative -mt-24 pt-16 md:pt-32" style={{ backgroundColor: rawTheme.backgroundColor || '#f9fafb', zIndex: 10 }}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 lg:w-[70%]">
            {writer.bio && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <p className="text-gray-700 whitespace-pre-line">{writer.bio}</p>
              </div>
            )}
            <section>
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('section.recentArticles', lang)}</h2>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('section.recentArticlesEn', lang)}</p>
              </div>
              {localizedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{localizedArticles.map((article) => (<ArticleCard key={article.id} article={article} lang={lang} />))}</div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12 flex flex-col items-center justify-center">
                  {rawSiteInfo.faviconUrl ? <div className="relative w-20 h-20 mb-4 opacity-30"><Image src={rawSiteInfo.faviconUrl} alt="Site Icon" fill className="object-contain" /></div> : <svg className="w-16 h-16 mb-4 opacity-30 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  <p className="text-sm text-gray-900">{t('message.noWriterArticles', lang)}</p>
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
                popularTags={popularSearchTags}
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
            {footerBlocks.length > 0 && <SidebarBanners blocks={footerBlocks} />}
            {rawTheme.snsSettings?.xUserId && <XLink username={rawTheme.snsSettings.xUserId} lang={lang} />}
          </aside>
        </div>
      </main>

      {footerContents.length > 0 && <section className="w-full"><FooterContentRenderer contents={footerContents} lang={lang} /></section>}
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

