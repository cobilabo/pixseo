import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import { getTagServer } from '@/lib/firebase/tags-server';
import { getArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizeCategory, localizeTag, localizeArticle } from '@/lib/i18n/localize';
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

export const revalidate = 60;

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
    return { title: 'タグが見つかりません' };
  }

  const tag = localizeTag(rawTag, lang);
  const rawSiteInfo = mediaId ? await getSiteInfo(mediaId) : { name: 'メディアサイト', name_ja: 'メディアサイト', description: '', logoUrl: '', faviconUrl: undefined, allowIndexing: false };
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);

  return {
    title: `${tag.name}の記事一覧 | ${siteInfo.name}`,
    description: `${tag.name}に関する記事一覧`,
    robots: { index: rawSiteInfo.allowIndexing, follow: rawSiteInfo.allowIndexing },
    icons: rawSiteInfo.faviconUrl ? { icon: rawSiteInfo.faviconUrl, apple: rawSiteInfo.faviconUrl } : undefined,
    alternates: {
      canonical: `https://${process.env.NEXT_PUBLIC_BASE_URL}/${lang}/tags/${params.slug}`,
      languages: {
        'ja-JP': `https://${process.env.NEXT_PUBLIC_BASE_URL}/ja/tags/${params.slug}`,
        'en-US': `https://${process.env.NEXT_PUBLIC_BASE_URL}/en/tags/${params.slug}`,
        'zh-CN': `https://${process.env.NEXT_PUBLIC_BASE_URL}/zh/tags/${params.slug}`,
        'ko-KR': `https://${process.env.NEXT_PUBLIC_BASE_URL}/ko/tags/${params.slug}`,
        'x-default': `https://${process.env.NEXT_PUBLIC_BASE_URL}/ja/tags/${params.slug}`,
      },
    },
    openGraph: {
      title: `${tag.name}の記事一覧 | ${siteInfo.name}`,
      description: `${tag.name}に関する記事一覧`,
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
  const tag = localizeTag(rawTag, lang);

  const [rawSiteInfo, rawTheme, articles, popularArticles, allCategories] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getArticlesServer({ tagId: rawTag.id, limit: 30 }),
    getPopularArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
  ]);
  
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const categories = allCategories.filter(cat => !mediaId || cat.mediaId === mediaId).map(cat => localizeCategory(cat, lang));
  const localizedArticles = articles.map(art => localizeArticle(art, lang));
  const localizedPopularArticles = popularArticles.map(art => localizeArticle(art, lang));
  
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: rawTheme.backgroundColor }}>
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {rawTheme.firstView && (
        <FirstView settings={theme.firstView} customTitle={tag.name} customSubtitle="TAG" customMeta={`${localizedArticles.length}件の記事`} showCustomContent={true} />
      )}
      <MediaHeader siteName={siteInfo.name} siteInfo={rawSiteInfo} menuSettings={theme.menuSettings} menuBackgroundColor={rawTheme.menuBackgroundColor} menuTextColor={rawTheme.menuTextColor} lang={lang} />
      <CategoryBar categories={categories} variant="half" lang={lang} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ backgroundColor: rawTheme.backgroundColor }}>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 lg:w-[70%]">
            <section>
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">新着記事</h2>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Recent Articles</p>
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
            <PopularArticles articles={localizedPopularArticles} categories={allCategories} lang={lang} />
            <RecommendedArticles articles={localizedArticles} categories={allCategories} lang={lang} />
            {footerBlocks.length > 0 && <SidebarBanners blocks={footerBlocks} />}
            <XLink username="moncson" />
          </aside>
        </div>
      </main>
      {footerContents.length > 0 && <section className="w-full"><FooterContentRenderer contents={footerContents} /></section>}
      <footer style={{ backgroundColor: rawTheme.footerBackgroundColor }} className="text-white">
        {footerTextLinkSections.length > 0 ? (
          <div className="py-12">
            <div className={`w-full grid ${footerTextLinkSections.length === 1 ? 'grid-cols-2' : 'grid-cols-3'} pb-8`}>
              <div className="text-left px-8">
                <div className="flex items-center gap-3 mb-4">
                  {rawSiteInfo.faviconUrl && <Image src={rawSiteInfo.faviconUrl} alt={`${siteInfo.name} アイコン`} width={32} height={32} className="w-8 h-8 brightness-0 invert" unoptimized={rawSiteInfo.faviconUrl.endsWith('.svg')} />}
                  {rawSiteInfo.logoUrl ? <Image src={rawSiteInfo.logoUrl} alt={siteInfo.name} width={120} height={32} className="h-8 w-auto brightness-0 invert" unoptimized={rawSiteInfo.logoUrl.endsWith('.svg')} /> : <h3 className="text-2xl font-bold">{siteInfo.name}</h3>}
                </div>
                {siteInfo.description && <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{siteInfo.description}</p>}
              </div>
              {footerTextLinkSections.map((section: any, index: number) => {
                const validLinks = section.links?.filter((link: any) => link.text && link.url) || [];
                if (!section.title && validLinks.length === 0) return null;
                return (
                  <div key={index} className="text-right border-l border-gray-600 px-8">
                    {section.title && <h3 className="text-base font-bold mb-4 uppercase tracking-wider">{section.title}</h3>}
                    {validLinks.length > 0 && <ul className="space-y-2">{validLinks.map((link: any, linkIndex: number) => (<li key={linkIndex}><a href={link.url} className="text-gray-300 hover:text-white transition-colors text-sm" target={link.url.startsWith('http') ? '_blank' : undefined} rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}>{link.text}</a></li>))}</ul>}
                  </div>
                );
              })}
            </div>
            <div className="w-full border-t border-gray-700 pt-6"><p className="text-gray-400 text-sm text-center">© {new Date().getFullYear()} {siteInfo.name}. All rights reserved.</p></div>
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
      <ScrollToTopButton primaryColor={rawTheme.primaryColor} />
    </div>
  );
}

