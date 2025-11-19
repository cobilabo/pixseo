import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { 
  getArticleServer, 
  getRelatedArticlesServer, 
  getCategoriesServer,
  getTagsServer,
  getWriterServer,
  getAdjacentArticlesServer,
  getPopularArticlesServer 
} from '@/lib/firebase/articles-server';
import { getCategoriesServer as getAllCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { FooterContent, FooterTextLinkSection } from '@/types/theme';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import { 
  localizeSiteInfo, 
  localizeTheme, 
  localizeCategory, 
  localizeTag,
  localizeWriter,
  localizeArticle 
} from '@/lib/i18n/localize';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FirstView from '@/components/layout/FirstView';
import ArticleContent from '@/components/articles/ArticleContent';
import RelatedArticles from '@/components/articles/RelatedArticles';
import GoogleMapsEmbed from '@/components/common/GoogleMapsEmbed';
import TableOfContents from '@/components/articles/TableOfContents';
import SocialShare from '@/components/articles/SocialShare';
import Breadcrumbs from '@/components/articles/Breadcrumbs';
import CategoryTagBadges from '@/components/articles/CategoryTagBadges';
import ArticleNavigation from '@/components/articles/ArticleNavigation';
import AuthorProfile from '@/components/articles/AuthorProfile';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import XLink from '@/components/common/XLink';
import SidebarBanners from '@/components/common/SidebarBanners';
import Image from 'next/image';

// ISR: 5分ごとに再生成
export const revalidate = 300;

interface PageProps {
  params: {
    lang: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const mediaId = await getMediaIdFromHost();
  const rawArticle = await getArticleServer(params.slug, mediaId || undefined);
  
  if (!rawArticle) {
    return {
      title: '記事が見つかりません',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // 記事を多言語化
  const article = localizeArticle(rawArticle, lang);

  // サイトのインデックス設定を取得
  const rawSiteInfo = mediaId 
    ? await getSiteInfo(mediaId) 
    : { 
        allowIndexing: false, 
        name: 'メディアサイト',
        name_ja: 'メディアサイト', 
        name_en: 'Media Site', 
        name_zh: '媒体网站', 
        name_ko: '미디어 사이트',
        description: '',
        logoUrl: '',
        faviconUrl: '',
      };
  
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  
  // インデックス制御のロジック
  const allowIndexing = rawSiteInfo.allowIndexing && rawArticle.isPublished;
  
  // カテゴリー・タグ・ライター情報を取得
  const [rawCategories, rawTags, rawWriter] = await Promise.all([
    rawArticle.categoryIds ? getCategoriesServer(rawArticle.categoryIds).catch(() => []) : Promise.resolve([]),
    rawArticle.tagIds ? getTagsServer(rawArticle.tagIds).catch(() => []) : Promise.resolve([]),
    rawArticle.writerId ? getWriterServer(rawArticle.writerId).catch(() => null) : Promise.resolve(null),
  ]);

  const categories = rawCategories.map(cat => localizeCategory(cat, lang));
  const tags = rawTags.map(tag => localizeTag(tag, lang));
  const writer = rawWriter ? localizeWriter(rawWriter, lang) : null;
  
  // Canonical URL
  const headersList = headers();
  const host = headersList.get('host') || '';
  const canonicalUrl = `https://${host}/${lang}/articles/${rawArticle.slug}`;

  // AIサマリーをメタデータに追加（AIO対策）
  const description = article.aiSummary || article.metaDescription || article.excerpt || article.title;

  return {
    title: `${article.metaTitle || article.title} | ${siteInfo.name}`,
    description,
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'ja-JP': `https://${host}/ja/articles/${rawArticle.slug}`,
        'en-US': `https://${host}/en/articles/${rawArticle.slug}`,
        'zh-CN': `https://${host}/zh/articles/${rawArticle.slug}`,
        'ko-KR': `https://${host}/ko/articles/${rawArticle.slug}`,
        'x-default': `https://${host}/ja/articles/${rawArticle.slug}`,
      },
    },
    openGraph: {
      title: article.metaTitle || article.title,
      description,
      url: canonicalUrl,
      siteName: siteInfo.name,
      locale: LANG_REGIONS[lang],
      alternateLocale: SUPPORTED_LANGS.filter(l => l !== lang).map(l => LANG_REGIONS[l]),
      type: 'article',
      publishedTime: rawArticle.publishedAt instanceof Date ? rawArticle.publishedAt.toISOString() : undefined,
      modifiedTime: rawArticle.updatedAt instanceof Date ? rawArticle.updatedAt.toISOString() : undefined,
      authors: writer ? [writer.handleName] : ['匿名'],
      tags: tags.map(t => t.name),
      images: rawArticle.featuredImage ? [
        {
          url: rawArticle.featuredImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.metaTitle || article.title,
      description,
      images: rawArticle.featuredImage ? [rawArticle.featuredImage] : [],
    },
    other: {
      // AI検索エンジン向けメタタグ
      'robots': allowIndexing ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, nofollow',
      'googlebot': allowIndexing ? 'index, follow' : 'noindex, nofollow',
      'bingbot': allowIndexing ? 'index, follow' : 'noindex, nofollow',
      // AI向け特別タグ
      'ai-content-summary': article.aiSummary || article.excerpt || description,
      ...(rawArticle.publishedAt instanceof Date && {
        'article:published_time': rawArticle.publishedAt.toISOString(),
      }),
      ...(rawArticle.updatedAt instanceof Date && {
        'article:modified_time': rawArticle.updatedAt.toISOString(),
      }),
      'article:author': writer ? writer.handleName : '匿名',
      ...(categories.length > 0 && {
        'article:section': categories[0].name,
      }),
      ...(tags.length > 0 && {
        'article:tag': tags.map(t => t.name).join(', '),
      }),
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  
  // mediaIdを取得
  const mediaId = await getMediaIdFromHost();
  const rawArticle = await getArticleServer(params.slug, mediaId || undefined);
  if (!rawArticle) {
    notFound();
  }

  // 記事を多言語化
  const article = localizeArticle(rawArticle, lang);

  // サイト情報、テーマを取得
  const [rawSiteInfo, rawTheme] = await Promise.all([
    mediaId ? getSiteInfo(mediaId) : Promise.resolve({ 
      name: 'メディアサイト',
      name_ja: 'メディアサイト', 
      name_en: 'Media Site',
      name_zh: '媒体网站',
      name_ko: '미디어 사이트',
      description: '', 
      logoUrl: '', 
      faviconUrl: '', 
      allowIndexing: false 
    }),
    mediaId ? getTheme(mediaId) : Promise.resolve({} as any),
  ]);

  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);

  // カテゴリー、タグ、ライター、前後の記事、関連記事、全カテゴリー、人気記事を並行取得
  const [rawCategories, rawTags, rawWriter, adjacentArticles, rawRelatedArticles, allCategories, rawPopularArticles] = await Promise.all([
    getCategoriesServer(rawArticle.categoryIds || []).catch(() => []),
    getTagsServer(rawArticle.tagIds || []).catch(() => []),
    rawArticle.writerId ? getWriterServer(rawArticle.writerId).catch(() => null) : Promise.resolve(null),
    getAdjacentArticlesServer(rawArticle, mediaId || undefined).catch(() => ({ previousArticle: null, nextArticle: null })),
    getRelatedArticlesServer(rawArticle, 6, mediaId || undefined).catch(() => []),
    getAllCategoriesServer().catch(() => []),
    getPopularArticlesServer(10, mediaId || undefined).catch(() => []),
  ]);
  
  // 多言語化
  const categories = rawCategories.map(cat => localizeCategory(cat, lang));
  const tags = rawTags.map(tag => localizeTag(tag, lang));
  const writer = rawWriter ? localizeWriter(rawWriter, lang) : null;
  const relatedArticles = rawRelatedArticles.map(art => localizeArticle(art, lang));
  const popularArticles = rawPopularArticles.map(art => localizeArticle(art, lang));
  
  // 前後の記事のカテゴリー情報を取得
  const [previousCategories, nextCategories] = await Promise.all([
    adjacentArticles.previousArticle && adjacentArticles.previousArticle.categoryIds?.length
      ? getCategoriesServer(adjacentArticles.previousArticle.categoryIds).catch(() => [])
      : Promise.resolve([]),
    adjacentArticles.nextArticle && adjacentArticles.nextArticle.categoryIds?.length
      ? getCategoriesServer(adjacentArticles.nextArticle.categoryIds).catch(() => [])
      : Promise.resolve([]),
  ]);
  
  // 前後の記事も多言語化
  const localizedPreviousArticle = adjacentArticles.previousArticle 
    ? localizeArticle(adjacentArticles.previousArticle, lang)
    : null;
  const localizedNextArticle = adjacentArticles.nextArticle 
    ? localizeArticle(adjacentArticles.nextArticle, lang)
    : null;
  
  // mediaIdでカテゴリーをフィルタリング
  const headerCategories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId).map(cat => localizeCategory(cat, lang))
    : allCategories.map(cat => localizeCategory(cat, lang));

  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(rawTheme);
  
  // フッターデータを取得
  const footerBlocks = rawTheme.footerBlocks?.filter((block: any) => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];
  
  // パンくずリスト用のカテゴリー（最初の1つ）
  const category = categories.length > 0 ? categories[0] : null;

  // JSON-LD 構造化データ（SEO強化 + AIO対策）
  const headersList = headers();
  const host = headersList.get('host') || '';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title || '',
    description: article.aiSummary || article.excerpt || article.metaDescription || article.title || '',
    abstract: article.aiSummary || article.excerpt || '',
    image: rawArticle.featuredImage || '',
    datePublished: rawArticle.publishedAt instanceof Date ? rawArticle.publishedAt.toISOString() : new Date().toISOString(),
    dateModified: rawArticle.updatedAt instanceof Date ? rawArticle.updatedAt.toISOString() : new Date().toISOString(),
    inLanguage: LANG_REGIONS[lang],
    author: writer ? {
      '@type': 'Person',
      name: writer.handleName,
      url: `https://${host}/${lang}/writers/${rawWriter?.id}`,
      image: rawWriter?.icon || '',
      description: writer.bio || '',
    } : {
      '@type': 'Person',
      name: '匿名',
    },
    publisher: {
      '@type': 'Organization',
      name: siteInfo.name,
      logo: rawSiteInfo.logoUrl ? {
        '@type': 'ImageObject',
        url: rawSiteInfo.logoUrl,
      } : undefined,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://${host}/${lang}/articles/${rawArticle.slug || ''}`,
    },
  };

  // FAQスキーマ（よくある質問がある場合）- 多言語対応
  const faqSchema = article.faqs && article.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: LANG_REGIONS[lang],
    mainEntity: article.faqs.map((faq: any) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: rawTheme.backgroundColor || '#f9fafb' }}>
      {/* Themeスタイル注入 */}
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* FAQスキーマ（SEO強化 + AIO対策） */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ヘッダー */}
      <MediaHeader 
        siteName={siteInfo.name}
        siteInfo={rawSiteInfo}
        menuSettings={theme.menuSettings}
        menuBackgroundColor={rawTheme.menuBackgroundColor}
        menuTextColor={rawTheme.menuTextColor}
        lang={lang}
      />

      {/* FV（ファーストビュー）- アイキャッチ画像 */}
      {rawArticle.featuredImage && (
        <FirstView 
          settings={{
            imageUrl: rawArticle.featuredImage,
            catchphrase: '',
            description: ''
          }}
          customTitle={article.title}
          customSubtitle=""
          customMeta={`${t('article.published', lang)}: ${
            rawArticle.publishedAt ? (
              rawArticle.publishedAt instanceof Date 
                ? rawArticle.publishedAt.toLocaleDateString(LANG_REGIONS[lang], { year: 'numeric', month: 'numeric', day: 'numeric' })
                : new Date((rawArticle.publishedAt as any).toDate()).toLocaleDateString(LANG_REGIONS[lang], { year: 'numeric', month: 'numeric', day: 'numeric' })
            ) : '日付不明'
          }${
            rawArticle.updatedAt ? ` • ${t('article.updated', lang)}: ${
              rawArticle.updatedAt instanceof Date 
                ? rawArticle.updatedAt.toLocaleDateString(LANG_REGIONS[lang], { year: 'numeric', month: 'numeric', day: 'numeric' })
                : new Date((rawArticle.updatedAt as any).toDate()).toLocaleDateString(LANG_REGIONS[lang], { year: 'numeric', month: 'numeric', day: 'numeric' })
            }` : ''
          }${
            rawArticle.viewCount !== undefined ? ` • ${rawArticle.viewCount} views` : ''
          }${
            rawArticle.readingTime ? ` • ${t('article.readingTime', lang, { minutes: rawArticle.readingTime })}` : ''
          }`}
          showCustomContent={true}
        />
      )}

      {/* カテゴリーバー（透明背景・上半分） */}
      <CategoryBar categories={headerCategories} variant="half" lang={lang} />

      {/* メインコンテンツエリア以降（背景色付き・前面・カテゴリーパネルの下半分に重なる） */}
      <div className="relative -mt-24 pt-32" style={{ backgroundColor: rawTheme.backgroundColor || '#f9fafb', zIndex: 10 }}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* メインカラム（70%） */}
          <div className="flex-1 lg:w-[70%]">
            {/* パンくずリスト */}
            <Breadcrumbs article={article} category={category} lang={lang} />

            {/* カテゴリー・タグバッジ */}
            <CategoryTagBadges categories={categories} tags={tags} lang={lang} />

            {/* 目次 */}
            {Array.isArray(article.tableOfContents) && article.tableOfContents.length > 0 && (
              <TableOfContents items={article.tableOfContents} faviconUrl={rawSiteInfo.faviconUrl} lang={lang} />
            )}

            {/* 記事本文 */}
            <article className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
              <ArticleContent 
                content={typeof article.content === 'string' ? article.content : ''} 
                tableOfContents={Array.isArray(article.tableOfContents) ? article.tableOfContents : []} 
              />
            </article>

            {/* 前後の記事ナビゲーション */}
            <ArticleNavigation 
              previousArticle={localizedPreviousArticle} 
              nextArticle={localizedNextArticle}
              previousCategories={previousCategories}
              nextCategories={nextCategories}
              logoUrl={rawSiteInfo.faviconUrl}
              lang={lang}
            />

            {/* SNSシェアボタン */}
            <SocialShare title={typeof article.title === 'string' ? article.title : ''} lang={lang} />

            {/* Googleマイマップ */}
            {rawArticle.googleMapsUrl && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">地図情報</h2>
                <GoogleMapsEmbed url={rawArticle.googleMapsUrl} />
              </div>
            )}

            {/* 認証店予約ボタン */}
            {rawArticle.reservationUrl && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
                <a
                  href={rawArticle.reservationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  予約する
                </a>
              </div>
            )}

            {/* 関連記事 */}
            {relatedArticles.length > 0 && (
              <RelatedArticles articles={relatedArticles} lang={lang} />
            )}
          </div>

          {/* サイドバー（30%） */}
          <aside className="w-full lg:w-[30%] space-y-6">
            {/* 著者プロフィール */}
            {writer && <AuthorProfile writer={writer} lang={lang} />}

            {/* 人気記事 */}
            <PopularArticles articles={popularArticles} categories={allCategories} lang={lang} />

            {/* おすすめ記事 */}
            <RecommendedArticles articles={relatedArticles} categories={allCategories} lang={lang} />

            {/* バナーエリア */}
            {footerBlocks.length > 0 && (
              <SidebarBanners blocks={footerBlocks} />
            )}

            {/* Xタイムライン */}
            {rawTheme.snsSettings?.xUserId && (
              <XLink username={rawTheme.snsSettings.xUserId} lang={lang} />
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

          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-0 py-12">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold">{siteInfo.name}</h3>
              {siteInfo.description && (
                <p className="text-gray-300 max-w-2xl mx-auto whitespace-pre-line">
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

