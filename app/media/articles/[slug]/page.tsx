import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
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
import { Article } from '@/types/article';
import { FooterContent, FooterTextLinkSection } from '@/types/theme';
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
import PopularArticles from '@/components/common/PopularArticles';
import RecommendedArticles from '@/components/common/RecommendedArticles';
import XLink from '@/components/common/XLink';
import SidebarBanners from '@/components/common/SidebarBanners';
import Image from 'next/image';

// 動的レンダリング + Firestoreキャッシュで高速化
// headers()を使用しているため、完全な静的生成はできない
// が、メモリキャッシュ（5分）により 30〜50ms の高速応答を実現
export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // mediaIdを取得（キャッシュ付き共通関数）
  const mediaId = await getMediaIdFromHost();
  const article = await getArticleServer(params.slug, mediaId || undefined);
  
  if (!article) {
    return {
      title: '記事が見つかりません | ふらっと。',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // サイトのインデックス設定を取得（キャッシュ付き共通関数）
  const { allowIndexing: siteAllowIndexing, name: siteName } = mediaId 
    ? await getSiteInfo(mediaId) 
    : { allowIndexing: false, name: 'ふらっと。' };
  
  // インデックス制御のロジック
  // 1. サイトがNOINDEX → すべての記事もNOINDEX
  // 2. サイトがINDEXで記事が非公開 → NOINDEX
  // 3. サイトがINDEXで記事が公開 → INDEX
  const allowIndexing = siteAllowIndexing && article.isPublished;
  
  // カテゴリー・タグ・ライター情報を取得（メタデータ用）
  const categories = article.categoryIds ? await getCategoriesServer(article.categoryIds).catch(() => []) : [];
  const tags = article.tagIds ? await getTagsServer(article.tagIds).catch(() => []) : [];
  const writer = article.writerId ? await getWriterServer(article.writerId).catch(() => null) : null;
  
  // Canonical URL（重複コンテンツ回避）
  const headersList = headers();
  const host = headersList.get('host') || '';
  const canonicalUrl = `https://${host}/articles/${article.slug}`;

  return {
    title: `${article.metaTitle || article.title} | ${siteName}`,
    description: article.metaDescription || article.excerpt || article.title,
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    // Canonical URL設定（SEO重要）
    alternates: {
      canonical: canonicalUrl,
    },
    // Open Graph最適化（SNSシェア用）
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || article.title,
      url: canonicalUrl,
      siteName: siteName,
      locale: 'ja_JP',
      type: 'article',
      publishedTime: article.publishedAt instanceof Date ? article.publishedAt.toISOString() : undefined,
      modifiedTime: article.updatedAt instanceof Date ? article.updatedAt.toISOString() : undefined,
      authors: writer ? [writer.handleName] : ['匿名'],
      tags: tags.map(t => t.name),
      images: article.featuredImage ? [
        {
          url: article.featuredImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ] : [],
    },
    // Twitter Card最適化
    twitter: {
      card: 'summary_large_image',
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || article.title,
      images: article.featuredImage ? [article.featuredImage] : [],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  // mediaIdを取得（キャッシュ付き共通関数）
  const mediaId = await getMediaIdFromHost();
  const article = await getArticleServer(params.slug, mediaId || undefined);
  if (!article) {
    notFound();
  }

  // サイト情報、テーマを取得
  const [siteInfo, theme] = await Promise.all([
    mediaId ? getSiteInfo(mediaId) : Promise.resolve({ name: 'メディアサイト', description: '', logoUrl: '', faviconUrl: '', allowIndexing: false }),
    mediaId ? getTheme(mediaId) : Promise.resolve({} as any),
  ]);
  const siteName = siteInfo.name;

  // カテゴリー、タグ、ライター、前後の記事、関連記事、全カテゴリー、人気記事を並行取得
  const [categories, tags, writer, adjacentArticles, relatedArticles, allCategories, popularArticles] = await Promise.all([
    // カテゴリー情報を取得
    getCategoriesServer(article.categoryIds || []).catch((error) => {
      console.error('[Article Page] Error fetching categories:', error);
      return [];
    }),
    // タグ情報を取得
    getTagsServer(article.tagIds || []).catch((error) => {
      console.error('[Article Page] Error fetching tags:', error);
      return [];
    }),
    // ライター情報を取得
    article.writerId ? getWriterServer(article.writerId).catch((error) => {
      console.error('[Article Page] Error fetching writer:', error);
      return null;
    }) : Promise.resolve(null),
    // 前後の記事を取得
    getAdjacentArticlesServer(article, mediaId || undefined).catch((error) => {
      console.error('[Article Page] Error fetching adjacent articles:', error);
      return { previousArticle: null, nextArticle: null };
    }),
    // 関連記事を取得
    getRelatedArticlesServer(article, 6, mediaId || undefined).catch((error) => {
      console.error('[Article Page] Error fetching related articles:', error);
      return [];
    }),
    // 全カテゴリーを取得（ヘッダー用）
    getAllCategoriesServer().catch((error) => {
      console.error('[Article Page] Error fetching all categories:', error);
      return [];
    }),
    // 人気記事を取得（サイドバー用）
    getPopularArticlesServer(10, mediaId || undefined).catch((error) => {
      console.error('[Article Page] Error fetching popular articles:', error);
      return [];
    }),
  ]);
  
  // 前後の記事のカテゴリー情報を取得
  const [previousCategories, nextCategories] = await Promise.all([
    adjacentArticles.previousArticle && adjacentArticles.previousArticle.categoryIds?.length
      ? getCategoriesServer(adjacentArticles.previousArticle.categoryIds).catch(() => [])
      : Promise.resolve([]),
    adjacentArticles.nextArticle && adjacentArticles.nextArticle.categoryIds?.length
      ? getCategoriesServer(adjacentArticles.nextArticle.categoryIds).catch(() => [])
      : Promise.resolve([]),
  ]);
  
  // mediaIdでカテゴリーをフィルタリング
  const headerCategories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // ThemeスタイルとカスタムCSSを生成
  const combinedStyles = getCombinedStyles(theme);
  
  // フッターデータを取得
  const footerBlocks = theme.footerBlocks?.filter((block: any) => block.imageUrl) || [];
  const footerContents = theme.footerContents?.filter((content: FooterContent) => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter((section: FooterTextLinkSection) => section.title || section.links?.length > 0) || [];
  
  // パンくずリスト用のカテゴリー（最初の1つ）
  const category = categories.length > 0 ? categories[0] : null;

  // JSON-LD 構造化データ（SEO強化）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title || '',
    description: article.excerpt || article.metaDescription || article.title || '',
    image: article.featuredImage || '',
    datePublished: article.publishedAt instanceof Date ? article.publishedAt.toISOString() : new Date().toISOString(),
    dateModified: article.updatedAt instanceof Date ? article.updatedAt.toISOString() : new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: writer?.handleName || '匿名',
    },
    publisher: {
      '@type': 'Organization',
      name: 'ふらっと。',
      logo: {
        '@type': 'ImageObject',
        url: 'https://the-ayumi.jp/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://the-ayumi.jp/media/articles/${article.slug || ''}`,
    },
  };

  // FAQスキーマ（よくある質問がある場合）
  const faqSchema = article.faqs && article.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor || '#f9fafb' }}>
      {/* Themeスタイル注入 */}
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* FAQスキーマ（SEO強化 - リッチスニペット表示） */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ヘッダー */}
      <MediaHeader 
        siteName={siteName}
        siteInfo={siteInfo}
        menuSettings={theme.menuSettings}
        menuBackgroundColor={theme.menuBackgroundColor}
        menuTextColor={theme.menuTextColor}
      />

      {/* FV（ファーストビュー）- アイキャッチ画像 */}
      {article.featuredImage && (
        <FirstView 
          settings={{
            imageUrl: article.featuredImage,
            catchphrase: '',
            description: ''
          }}
          customTitle={article.title}
          customSubtitle=""
          customMeta={`公開: ${
            article.publishedAt ? (
              article.publishedAt instanceof Date 
                ? article.publishedAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
                : new Date((article.publishedAt as any).toDate()).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
            ) : '日付不明'
          }${
            article.updatedAt ? ` • 更新: ${
              article.updatedAt instanceof Date 
                ? article.updatedAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
                : new Date((article.updatedAt as any).toDate()).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
            }` : ''
          }${
            article.viewCount !== undefined ? ` • ${article.viewCount} views` : ''
          }${
            article.readingTime ? ` • この記事は約${article.readingTime}分で読めます` : ''
          }`}
          showCustomContent={true}
        />
      )}

      {/* カテゴリーバー */}
      <CategoryBar categories={headerCategories} variant="half" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* メインカラム（70%） */}
          <div className="flex-1 lg:w-[70%]">
            {/* パンくずリスト */}
            <Breadcrumbs article={article} category={category} />

            {/* カテゴリー・タグバッジ */}
            <CategoryTagBadges categories={categories} tags={tags} />

            {/* 目次 */}
            {Array.isArray(article.tableOfContents) && article.tableOfContents.length > 0 && (
              <TableOfContents items={article.tableOfContents} faviconUrl={siteInfo.faviconUrl} />
            )}

            {/* 記事本文 */}
            <article className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
              <ArticleContent 
                content={typeof article.content === 'string' ? article.content : ''} 
                tableOfContents={Array.isArray(article.tableOfContents) ? article.tableOfContents : []} 
              />
            </article>

            {/* SNSシェアボタン */}
            <SocialShare title={typeof article.title === 'string' ? article.title : ''} />

            {/* Googleマイマップ */}
            {article.googleMapsUrl && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">地図情報</h2>
                <GoogleMapsEmbed url={article.googleMapsUrl} />
              </div>
            )}

            {/* 認証店予約ボタン */}
            {article.reservationUrl && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
                <a
                  href={article.reservationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  予約する
                </a>
              </div>
            )}

            {/* 前後の記事ナビゲーション */}
            <ArticleNavigation 
              previousArticle={adjacentArticles.previousArticle} 
              nextArticle={adjacentArticles.nextArticle}
              previousCategories={previousCategories}
              nextCategories={nextCategories}
            />

            {/* 関連記事 */}
            {relatedArticles.length > 0 && (
              <RelatedArticles articles={relatedArticles} />
            )}
          </div>

          {/* サイドバー（30%） */}
          <aside className="w-full lg:w-[30%] space-y-6">
            {/* 著者プロフィール */}
            {writer && <AuthorProfile writer={writer} />}

            {/* 人気記事 */}
            <PopularArticles articles={popularArticles} categories={allCategories} />

            {/* おすすめ記事 */}
            <RecommendedArticles articles={relatedArticles} categories={allCategories} />

            {/* バナーエリア */}
            {footerBlocks.length > 0 && (
              <SidebarBanners blocks={footerBlocks} />
            )}

            {/* Xタイムライン */}
            <XLink username="moncson" />
          </aside>
        </div>
      </main>

      {/* フッターコンテンツ（画面横いっぱい） */}
      {footerContents.length > 0 && (
        <section className="w-full">
          <FooterContentRenderer contents={footerContents} />
        </section>
      )}

      {/* フッター */}
      <footer style={{ backgroundColor: theme.footerBackgroundColor }} className="text-white">
        {footerTextLinkSections.length > 0 ? (
          <div className="py-12">
            <div className={`w-full grid ${footerTextLinkSections.length === 1 ? 'grid-cols-2' : 'grid-cols-3'} pb-8`}>
              {/* 左カラム: ロゴとディスクリプション */}
              <div className="text-left px-8">
                <div className="flex items-center gap-3 mb-4">
                  {siteInfo.faviconUrl && (
                    <Image
                      src={siteInfo.faviconUrl}
                      alt={`${siteInfo.name} アイコン`}
                      width={32}
                      height={32}
                      className="w-8 h-8 brightness-0 invert"
                      unoptimized={siteInfo.faviconUrl.endsWith('.svg')}
                    />
                  )}
                  {siteInfo.logoUrl ? (
                    <Image
                      src={siteInfo.logoUrl}
                      alt={siteInfo.name}
                      width={120}
                      height={32}
                      className="h-8 w-auto brightness-0 invert"
                      unoptimized={siteInfo.logoUrl.endsWith('.svg')}
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
              {footerTextLinkSections.map((section: FooterTextLinkSection, index: number) => {
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
                        {validLinks.map((link: any, linkIndex: number) => (
                          <li key={linkIndex}>
                            <a
                              href={link.url}
                              className="text-gray-300 hover:text-white transition-colors text-sm"
                              target={link.url.startsWith('http') ? '_blank' : undefined}
                              rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                            >
                              {link.text}
                            </a>
                          </li>
                        ))}
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

      {/* 上に戻るボタン */}
      <ScrollToTopButton primaryColor={theme.primaryColor} />
    </div>
  );
}
