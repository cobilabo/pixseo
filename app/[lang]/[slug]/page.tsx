import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { adminDb } from '@/lib/firebase/admin';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizePage } from '@/lib/i18n/localize';
import { t } from '@/lib/i18n/translations';
import MediaHeader from '@/components/layout/MediaHeader';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';

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
    };
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
  const [rawSiteInfo, rawTheme] = await Promise.all([
    getSiteInfo(mediaId),
    getTheme(mediaId),
  ]);

  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const combinedStyles = getCombinedStyles(rawTheme);

  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: rawTheme.backgroundColor }}>
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      <MediaHeader
        siteName={siteInfo.name}
        siteInfo={rawSiteInfo}
        menuSettings={theme.menuSettings}
        menuBackgroundColor={rawTheme.menuBackgroundColor}
        menuTextColor={rawTheme.menuTextColor}
        lang={lang}
      />

      {/* メインコンテンツエリア以降（背景色付き・前面） */}
      <div className="relative" style={{ backgroundColor: rawTheme.backgroundColor, zIndex: 10 }}>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </article>
      </main>

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

