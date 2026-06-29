import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  getCategoriesServer,
  getTagsServer,
  getAdjacentArticlesServer,
} from '@/lib/firebase/articles-server';
import {
  getMediaIdFromHost,
  getArticleServer,
  getSiteInfo,
  getTheme,
  getPopularArticlesServer,
  getRecentArticlesServer,
  getWriterServer,
  getRelatedArticlesServer,
  getAllCategoriesServer,
  getCategoriesWithCountServer,
  getAllTagsServer,
  getPopularSearchTagsServer,
  getApprovedPopularKeywordsServer,
} from '@/lib/firebase/cached';
import { getCombinedStyles } from '@/lib/firebase/theme-helper';
import { getSiteOrigin } from '@/lib/site-url';
import { FooterContent, FooterTextLinkSection } from '@/types/theme';
import { Lang, LANG_REGIONS, SUPPORTED_LANGS, isValidLang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';
import {
  formatArticleDate,
  toIsoDateStringOrNow,
} from '@/lib/article-date-display';
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
import FurattoFooter from '@/components/layout/FurattoFooter';
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import SidebarSnsLinks from '@/components/common/SidebarSnsLinks';
import SidebarBanners from '@/components/common/SidebarBanners';
import SearchWidget from '@/components/search/SearchWidget';
import { resolveFeaturedTags } from '@/lib/search/featured-tags';
import SidebarCustomHtml from '@/components/common/SidebarCustomHtml';
import SidebarRenderer from '@/components/common/SidebarRenderer';
import ViewCounter from '@/components/articles/ViewCounter';
import Image from 'next/image';

// ISR: 1時間ごとに再生成（記事更新時は revalidatePath で即時反映）
export const revalidate = 3600;

interface PageProps {
  params: {
    lang: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = isValidLang(params.lang) ? params.lang as Lang : 'ja';
  const mediaId = await getMediaIdFromHost();

  const defaultSiteInfo = { 
    allowIndexing: false, isPreview: false, name: 'メディアサイト',
    name_ja: 'メディアサイト', name_en: 'Media Site', name_zh: '媒体网站', name_ko: '미디어 사이트',
    description: '', logoUrl: '', faviconUrl: '',
  };

  // 記事取得とサイト情報取得を並列化（両方 mediaId のみに依存）
  const [rawArticle, rawSiteInfo] = await Promise.all([
    getArticleServer(params.slug, mediaId || undefined),
    mediaId ? getSiteInfo(mediaId) : Promise.resolve(defaultSiteInfo),
  ]);
  
  if (!rawArticle) {
    notFound();
  }

  const article = localizeArticle(rawArticle, lang);
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const allowIndexing = rawSiteInfo.allowIndexing && rawArticle.isPublished;
  
  const [rawCategories, rawTags, rawWriter] = await Promise.all([
    rawArticle.categoryIds ? getCategoriesServer(rawArticle.categoryIds).catch(() => []) : Promise.resolve([]),
    rawArticle.tagIds ? getTagsServer(rawArticle.tagIds).catch(() => []) : Promise.resolve([]),
    rawArticle.writerId ? getWriterServer(rawArticle.writerId).catch(() => null) : Promise.resolve(null),
  ]);

  const categories = rawCategories.map(cat => localizeCategory(cat, lang));
  const tags = rawTags.map(tag => localizeTag(tag, lang));
  const writer = rawWriter ? localizeWriter(rawWriter, lang) : null;
  
  // Canonical URL（host ヘッダ → NEXT_PUBLIC_SITE_URL → フォールバックの順）
  const origin = getSiteOrigin();
  const canonicalUrl = `${origin}/${lang}/articles/${rawArticle.slug}`;

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
        'ja-JP': `${origin}/ja/articles/${rawArticle.slug}`,
        'en-US': `${origin}/en/articles/${rawArticle.slug}`,
        'zh-CN': `${origin}/zh/articles/${rawArticle.slug}`,
        'ko-KR': `${origin}/ko/articles/${rawArticle.slug}`,
        'x-default': `${origin}/ja/articles/${rawArticle.slug}`,
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
      authors: writer ? [writer.handleName] : ['Anonymous'],
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
      'article:author': writer ? writer.handleName : 'Anonymous',
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
  
  // ホスト情報を取得（client から内部リンクの絶対 URL 比較に使う）
  const headersList = headers();
  const siteHost = headersList.get('host') || '';
  // 公開サイトのオリジン（JSON-LD・canonical で利用）
  const siteOrigin = getSiteOrigin();
  
  const defaultSiteInfo = { 
    name: 'メディアサイト', name_ja: 'メディアサイト', name_en: 'Media Site',
    name_zh: '媒体网站', name_ko: '미디어 사이트',
    description: '', logoUrl: '', faviconUrl: '', ogImageUrl: '',
    allowIndexing: false, isPreview: false,
  };

  // Step 1: mediaId 取得
  const mediaId = await getMediaIdFromHost();

  // Step 2: 記事・サイト情報・テーマを並列取得（全て mediaId のみに依存）
  const [rawArticle, rawSiteInfo, rawTheme] = await Promise.all([
    getArticleServer(params.slug, mediaId || undefined),
    mediaId ? getSiteInfo(mediaId) : Promise.resolve(defaultSiteInfo),
    mediaId ? getTheme(mediaId) : Promise.resolve({} as any),
  ]);

  if (!rawArticle) {
    notFound();
  }

  const article = localizeArticle(rawArticle, lang);
  const siteInfo = localizeSiteInfo(rawSiteInfo, lang);
  const theme = localizeTheme(rawTheme, lang);

  // Step 3: 記事に依存するデータ + サイドバーデータを全て並列取得
  const [rawCategories, rawTags, rawWriter, adjacentArticles, rawRelatedArticles, allCategories, allCategoriesWithCount, allTags, rawPopularArticles, rawRecentArticles, popularSearchTags, popularSearchKeywords] = await Promise.all([
    getCategoriesServer(rawArticle.categoryIds || []).catch(() => []),
    getTagsServer(rawArticle.tagIds || []).catch(() => []),
    rawArticle.writerId ? getWriterServer(rawArticle.writerId).catch(() => null) : Promise.resolve(null),
    getAdjacentArticlesServer(rawArticle, mediaId || undefined).catch(() => ({ previousArticle: null, nextArticle: null })),
    getRelatedArticlesServer(rawArticle, 6, mediaId || undefined).catch(() => []),
    getAllCategoriesServer().catch(() => []),
    getCategoriesWithCountServer({ mediaId: mediaId || undefined }).catch(() => []),
    getAllTagsServer().catch(() => []),
    getPopularArticlesServer(10, mediaId || undefined).catch(() => []),
    getRecentArticlesServer(10, mediaId || undefined).catch(() => []),
    mediaId ? getPopularSearchTagsServer(mediaId, 30, 20).catch(() => []) : Promise.resolve([]),
    mediaId ? getApprovedPopularKeywordsServer(mediaId, 0, 50).catch(() => []) : Promise.resolve([]),
  ]);
  
  const categories = rawCategories.map(cat => localizeCategory(cat, lang));
  const tags = rawTags.map(tag => localizeTag(tag, lang));
  const writer = rawWriter ? localizeWriter(rawWriter, lang) : null;
  const relatedArticles = rawRelatedArticles.map(art => localizeArticle(art, lang));
  const popularArticles = rawPopularArticles.map(art => localizeArticle(art, lang));
  const localizedRecentArticles = rawRecentArticles.map(art => localizeArticle(art, lang));
  const categoriesWithCount = allCategoriesWithCount
    .filter(cat => !mediaId || cat.mediaId === mediaId)
    .map(cat => ({ ...localizeCategory(cat, lang), articleCount: cat.articleCount }));
  const sidebarTags = allTags
    .filter(tag => !mediaId || tag.mediaId === mediaId)
    .map(tag => localizeTag(tag, lang));

  const featuredTags = resolveFeaturedTags(
    sidebarTags,
    rawTheme.searchSettings?.featuredTagsSettings?.tagIds
  );
  
  // 前後記事のカテゴリーを並列取得（adjacentArticles の結果に依存するが、Step 3 完了後即座に実行）
  const [previousCategories, nextCategories] = await Promise.all([
    adjacentArticles.previousArticle?.categoryIds?.length
      ? getCategoriesServer(adjacentArticles.previousArticle.categoryIds).catch(() => [])
      : Promise.resolve([]),
    adjacentArticles.nextArticle?.categoryIds?.length
      ? getCategoriesServer(adjacentArticles.nextArticle.categoryIds).catch(() => [])
      : Promise.resolve([]),
  ]);
  
  const localizedPreviousArticle = adjacentArticles.previousArticle 
    ? localizeArticle(adjacentArticles.previousArticle, lang) : null;
  const localizedNextArticle = adjacentArticles.nextArticle 
    ? localizeArticle(adjacentArticles.nextArticle, lang) : null;
  
  const headerCategories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId).map(cat => localizeCategory(cat, lang))
    : allCategories.map(cat => localizeCategory(cat, lang));

  // カテゴリ名マップ（関連記事・カテゴリページ用）
  const catNameMap = new Map(headerCategories.map(c => [c.id, c.name]));

  // 関連記事にカテゴリ名を付与
  const relatedArticlesWithCats = relatedArticles.map(art => ({
    ...art,
    categoryNames: (art.categoryIds || []).map((id: string) => catNameMap.get(id)).filter(Boolean) as string[],
  }));

  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(rawTheme);
  
  // フッターデータを取得
  const footerBlocks = rawTheme.footerBlocks?.filter((block: any) => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter((content: any) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: any) => section.title || section.links?.length > 0) || [];
  
  // パンくずリスト用のカテゴリー（最初の1つ）
  const category = categories.length > 0 ? categories[0] : null;

  // アクセシビリティ系の記事かどうかを slug / カテゴリ / タグから推定し、
  // schema.org の accessibilityFeature を付与する。
  // 参考: https://schema.org/accessibilityFeature
  const accessibilityKeywords = ['barrier-free', 'barrierfree', 'accessible', 'accessibility', 'wheelchair', 'バリアフリー', 'アクセシブル', '車椅子', '車いす'];
  const articleHay = [
    rawArticle.slug || '',
    article.title || '',
    ...categories.map((c) => c.name || ''),
    ...categories.map((c) => c.slug || ''),
    ...tags.map((t) => t.name || ''),
    ...tags.map((t) => t.slug || ''),
  ].join(' ').toLowerCase();
  const isAccessibilityArticle = accessibilityKeywords.some((k) => articleHay.includes(k.toLowerCase()));

  // Organization スキーマ（記事の publisher を独立して再利用可能に）
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteOrigin}/#organization`,
    name: siteInfo.name,
    url: siteOrigin,
    ...(rawSiteInfo.logoUrl ? { logo: rawSiteInfo.logoUrl } : {}),
    ...(rawSiteInfo.ogImageUrl ? { image: rawSiteInfo.ogImageUrl } : {}),
  };

  // JSON-LD 構造化データ（SEO強化 + AIO対策）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title || '',
    description: article.aiSummary || article.excerpt || article.metaDescription || article.title || '',
    abstract: article.aiSummary || article.excerpt || '',
    image: rawArticle.featuredImage || '',
    datePublished: toIsoDateStringOrNow(rawArticle.publishedAt),
    dateModified: toIsoDateStringOrNow(rawArticle.updatedAt),
    inLanguage: LANG_REGIONS[lang],
    author: writer ? {
      '@type': 'Person',
      name: writer.handleName,
      url: `${siteOrigin}/${lang}/writers/${rawWriter?.id}`,
      image: rawWriter?.icon || '',
      description: writer.bio || '',
    } : {
      '@type': 'Person',
      name: 'Anonymous',
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${siteOrigin}/#organization`,
      name: siteInfo.name,
      logo: rawSiteInfo.logoUrl ? {
        '@type': 'ImageObject',
        url: rawSiteInfo.logoUrl,
      } : undefined,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteOrigin}/${lang}/articles/${rawArticle.slug || ''}`,
    },
    // アクセシビリティ系記事に対しては schema.org の accessibility 系プロパティを付与
    ...(isAccessibilityArticle && {
      about: 'Accessibility',
      accessibilityFeature: ['alternativeText', 'longDescription', 'readingOrder'],
    }),
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

  const themeClass = rawTheme.layoutTheme === 'furatto' ? 'theme-furatto-default' : '';

  return (
    <div className={`min-h-screen ${themeClass}`} style={{ backgroundColor: rawTheme.backgroundColor || '#f9fafb' }}>
      {/* Themeスタイル注入 */}
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* JSON-LD構造化データ: Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* JSON-LD構造化データ: Organization（再利用可能な publisher） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* FAQスキーマ（SEO強化 + AIO対策） */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* 閲覧数カウント（カスタムドメインの場合のみ） */}
      <ViewCounter 
        articleSlug={rawArticle.slug}
        mediaId={mediaId || undefined}
        isPreview={rawSiteInfo.isPreview}
      />

      {/* ヘッダー */}
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

      {/* FV（ファーストビュー） */}
      {rawTheme.layoutTheme === 'furatto' ? (
        <section className="furatto-article-hero relative w-full overflow-hidden" style={{ height: '400px', paddingTop: '160px' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300" />
          <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-8 text-white max-w-4xl mx-auto h-full">
            {article.title && (
              <h1 className="font-bold text-center mb-3 drop-shadow-lg text-xl sm:text-2xl md:text-3xl leading-snug">
                {article.title}
              </h1>
            )}
            <div className="flex flex-col md:flex-row md:gap-2 text-sm text-center md:text-left text-white/80 drop-shadow-md">
              <span>{t('article.published', lang)}: {formatArticleDate(rawArticle.publishedAt, lang)}</span>
              {rawArticle.updatedAt && <span className="hidden md:inline">•</span>}
              {rawArticle.updatedAt && <span>{t('article.updated', lang)}: {formatArticleDate(rawArticle.updatedAt, lang)}</span>}
              {/* SEO/CTR: 閲覧数 0 のときは非表示 */}
              {rawArticle.viewCount !== undefined && rawArticle.viewCount > 0 && <span className="hidden md:inline">•</span>}
              {rawArticle.viewCount !== undefined && rawArticle.viewCount > 0 && <span>{t('article.viewCount', lang, { count: rawArticle.viewCount })}</span>}
            </div>
          </div>
        </section>
      ) : rawArticle.featuredImage ? (
        <FirstView 
          settings={{
            imageUrl: rawArticle.featuredImage,
            catchphrase: '',
            description: ''
          }}
          customTitle={article.title}
          customSubtitle=""
          customMeta={{
            published: `${t('article.published', lang)}: ${formatArticleDate(rawArticle.publishedAt, lang)}`,
            updated: rawArticle.updatedAt
              ? `${t('article.updated', lang)}: ${formatArticleDate(rawArticle.updatedAt, lang)}`
              : undefined,
            views: rawArticle.viewCount !== undefined && rawArticle.viewCount > 0 ? t('article.viewCount', lang, { count: rawArticle.viewCount }) : undefined,
          }}
          showCustomContent={true}
        />
      ) : null}

      {/* カテゴリーバー / グローバルメニュー（ふらっとテーマでは記事ページでスキップ） */}
      {rawTheme.layoutTheme !== 'furatto' && (
        <CategoryBar 
          categories={headerCategories} 
          variant="half" 
          lang={lang} 
          globalNavItems={theme.menuSettings?.globalNavItems}
          globalMenuDesign={rawTheme.menuSettings?.globalMenuDesign}
          layoutTheme={rawTheme.layoutTheme}
        />
      )}

      {/* メインコンテンツエリア以降（背景色付き・前面） */}
      <div className={`relative ${rawTheme.layoutTheme === 'furatto' ? 'pt-8' : '-mt-24 pt-16 md:pt-32'}`} style={{ backgroundColor: rawTheme.backgroundColor || '#f9fafb', zIndex: 10 }}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* メインカラム（70%） */}
          <div className="flex-1 lg:w-[70%]">
            {/* ふらっとテーマ: サムネイル画像を角丸で表示 */}
            {/* next/image 経由で配信し、Firebase Storage の署名付き URL のクエリを最適化URLに隠蔽する */}
            {rawTheme.layoutTheme === 'furatto' && rawArticle.featuredImage && (
              <div className="mb-6 overflow-hidden rounded-2xl shadow-md">
                <Image
                  src={rawArticle.featuredImage}
                  alt={article.featuredImageAlt || article.title}
                  width={1200}
                  height={630}
                  className="w-full h-auto"
                  priority
                  sizes="(max-width: 1024px) 100vw, 800px"
                />
              </div>
            )}
            {/* 検索ウィジェット（ふらっとテーマ専用・記事ページ表示の場合） */}
            {rawTheme.layoutTheme === 'furatto' && rawTheme.searchSettings?.displayPages?.articlePages && (
              <div className="mb-6">
                <SearchWidget
                  searchSettings={rawTheme.searchSettings}
                  mediaId={mediaId || undefined}
                  lang={lang}
                  tags={sidebarTags}
                  categories={headerCategories}
                  popularTags={popularSearchTags}
                  popularKeywords={popularSearchKeywords}
                />
              </div>
            )}

            {/* パンくずリスト */}
            <Breadcrumbs article={article} category={category} lang={lang} siteOrigin={siteOrigin} />

            {/* カテゴリー・タグバッジ */}
            <CategoryTagBadges categories={categories} tags={tags} lang={lang} />

            {/* 目次（コンテンツ内にインライン目次がない場合のみ表示） */}
            {Array.isArray(article.tableOfContents) && article.tableOfContents.length > 0 &&
              !(typeof article.content === 'string' && article.content.includes('toc-placeholder')) && (
              <TableOfContents items={article.tableOfContents} lang={lang} />
            )}

            {/* 記事本文 */}
            <article className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
              <ArticleContent 
                content={typeof article.content === 'string' ? article.content : ''} 
                tableOfContents={Array.isArray(article.tableOfContents) ? article.tableOfContents : []}
                internalLinkStyle={theme.articleSettings?.internalLinkStyle || 'text'}
                lang={lang}
                siteHost={siteHost}
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('article.mapInfo', lang)}</h2>
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
                  {t('article.reserve', lang)}
                </a>
              </div>
            )}

            {/* 関連記事 */}
            {relatedArticlesWithCats.length > 0 && (
              <RelatedArticles articles={relatedArticlesWithCats} lang={lang} />
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
                tags={sidebarTags}
                categories={headerCategories}
                popularTags={popularSearchTags}
                popularKeywords={popularSearchKeywords}
                variant="compact"
              />
            )}

            {/* 著者プロフィール */}
            {writer && <AuthorProfile writer={writer} lang={lang} />}

            {/* サイドコンテンツ（設定に基づく） */}
            <SidebarRenderer
              sideContentItems={theme.sideContentItems ?? rawTheme.sideContentItems}
              sideContentHtmlItems={rawTheme.sideContentHtmlItems}
              recentArticles={localizedRecentArticles}
              popularArticles={popularArticles}
              recommendedArticles={relatedArticles}
              categories={categoriesWithCount}
              lang={lang}
            />

            {/* バナーエリア */}
            {footerBlocks.length > 0 && (
              <SidebarBanners blocks={footerBlocks} />
            )}

            {/* SNS リンク（X / Instagram） */}
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
      {rawTheme.layoutTheme === 'furatto' ? (
        <FurattoFooter
          siteInfo={siteInfo}
          menuSettings={rawTheme.menuSettings}
          categories={headerCategories}
          lang={lang}
          footerBackgroundColor={rawTheme.footerBackgroundColor}
        />
      ) : (
      <footer style={{ backgroundColor: rawTheme.footerBackgroundColor }} className="text-white">
        {footerTextLinkSections.length > 0 ? (
          <div className="py-12">
            <FooterTextLinksRenderer sections={footerTextLinkSections} siteInfo={siteInfo} lang={lang} layoutTheme={rawTheme.layoutTheme} />
            <div className="w-full border-t border-gray-700 pt-6">
              <p className="text-gray-400 text-sm text-center">
                © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center space-y-4">
              <p className="text-2xl font-bold">{siteInfo.name}</p>
              {siteInfo.description && (
                <p className="text-gray-300 max-w-2xl mx-auto whitespace-pre-line">{siteInfo.description}</p>
              )}
              <p className="text-gray-400 text-sm pt-4">
                © {new Date().getFullYear()} {siteInfo.name}. All rights reserved.
              </p>
            </div>
          </div>
        )}
      </footer>
      )}
      </div>

      {/* 上に戻るボタン */}
      <ScrollToTopButton primaryColor={rawTheme.primaryColor} />
    </div>
  );
}

