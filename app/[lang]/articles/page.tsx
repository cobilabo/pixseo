import { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { getArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { localizeSiteInfo, localizeTheme, localizeCategory, localizeArticle } from '@/lib/i18n/localize';
import { t } from '@/lib/i18n/translations';
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

interface PageProps {
  params: {
    lang: string;
  };
}

// ISR: 60秒ごとに再生成
export const revalidate = 60;

// 動的にメタデータを生成
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const mediaId = await getMediaIdFromHost();
  
  if (!mediaId) {
    return {
      title: '記事一覧',
      description: '',
    };
  }

  const rawSiteInfo = await getSiteInfo(mediaId);
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  
  return {
    title: `記事一覧 | ${siteInfo.name}`,
    description: siteInfo.description || '記事一覧',
    robots: {
      index: rawSiteInfo.allowIndexing,
      follow: rawSiteInfo.allowIndexing,
    },
    icons: rawSiteInfo.faviconUrl ? {
      icon: rawSiteInfo.faviconUrl,
      apple: rawSiteInfo.faviconUrl,
    } : undefined,
    alternates: {
      canonical: `https://${process.env.NEXT_PUBLIC_BASE_URL}/${lang}/articles`,
      languages: {
        'ja-JP': `https://${process.env.NEXT_PUBLIC_BASE_URL}/ja/articles`,
        'en-US': `https://${process.env.NEXT_PUBLIC_BASE_URL}/en/articles`,
        'zh-CN': `https://${process.env.NEXT_PUBLIC_BASE_URL}/zh/articles`,
        'ko-KR': `https://${process.env.NEXT_PUBLIC_BASE_URL}/ko/articles`,
        'x-default': `https://${process.env.NEXT_PUBLIC_BASE_URL}/ja/articles`,
      },
    },
    openGraph: {
      title: `記事一覧 | ${siteInfo.name}`,
      description: siteInfo.description || '記事一覧',
      locale: LANG_REGIONS[lang],
      alternateLocale: SUPPORTED_LANGS.filter(l => l !== lang).map(l => LANG_REGIONS[l]),
    },
  };
}

export default async function ArticlesPage({ params }: PageProps) {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  
  // mediaIdとhostを取得
  const mediaId = await getMediaIdFromHost();
  const headersList = headers();
  const host = headersList.get('host') || '';
  
  // サイト設定、Theme、記事、カテゴリーを並列取得
  const [rawSiteInfo, rawTheme, articles, popularArticles, allCategories] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getArticlesServer({ limit: 30, mediaId: mediaId || undefined }),
    getPopularArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
  ]);
  
  // 多言語化
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);
  const categories = allCategories
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => localizeCategory(cat, lang));
  const localizedArticles = articles.map(art => localizeArticle(art, lang));
  const localizedPopularArticles = popularArticles.map(art => localizeArticle(art, lang));
  
  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(rawTheme);
  
  // フッターブロックを取得（themeから）
  const footerBlocks = rawTheme.footerBlocks?.filter((block: any) => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];

  // JSON-LD構造化データ（CollectionPage）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `記事一覧 - ${siteInfo.name}`,
    description: `${siteInfo.name}の記事一覧`,
    url: `https://${host}/${lang}/articles`,
    inLanguage: LANG_REGIONS[lang],
    isPartOf: {
      '@type': 'WebSite',
      name: siteInfo.name,
      url: `https://${host}/${lang}`,
    },
  };

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
        <FirstView 
          settings={theme.firstView}
          customTitle={t('meta.articleList', lang)}
          customSubtitle="ARTICLES"
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
            {/* 記事一覧 */}
            <section>
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
                <div className="text-center py-12">
                  <p className="text-gray-600">{t('message.noArticles', lang)}</p>
                </div>
              )}
            </section>
          </div>

          {/* サイドバー（30%） */}
          <aside className="w-full lg:w-[30%] space-y-6">
            {/* 人気記事 */}
            <PopularArticles articles={localizedPopularArticles} categories={allCategories} lang={lang} />

            {/* おすすめ記事 */}
            <RecommendedArticles articles={localizedArticles} categories={allCategories} lang={lang} />

            {/* バナーエリア */}
            {footerBlocks.length > 0 && (
              <SidebarBanners blocks={footerBlocks} />
            )}

            {/* Xタイムライン */}
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
                        {validLinks.map((link: any, linkIndex: number) => {
                          // 内部リンクの場合は言語パスを追加
                          const href = link.url.startsWith('http') || link.url.startsWith('https')
                            ? link.url
                            : `/${lang}${link.url}`;
                          
                          return (
                            <li key={linkIndex}>
                              <Link
                                href={href}
                                className="text-gray-300 hover:text-white transition-colors text-sm"
                                target={link.url.startsWith('http') ? '_blank' : undefined}
                                rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                              >
                                {link.text}
                              </Link>
                            </li>
                          );
                        })}
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
  );
}

