import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { 
  getArticleServer, 
  getRelatedArticlesServer, 
  getCategoriesServer,
  getTagsServer,
  getWriterServer,
  getAdjacentArticlesServer 
} from '@/lib/firebase/articles-server';
import { getCategoriesServer as getAllCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { Article } from '@/types/article';
import MediaHeader from '@/components/layout/MediaHeader';
import ArticleContent from '@/components/articles/ArticleContent';
import RelatedArticles from '@/components/articles/RelatedArticles';
import ArticleHeader from '@/components/articles/ArticleHeader';
import GoogleMapsEmbed from '@/components/common/GoogleMapsEmbed';
import TableOfContents from '@/components/articles/TableOfContents';
import ReadingTime from '@/components/articles/ReadingTime';
import SocialShare from '@/components/articles/SocialShare';
import Breadcrumbs from '@/components/articles/Breadcrumbs';
import CategoryTagBadges from '@/components/articles/CategoryTagBadges';
import ArticleNavigation from '@/components/articles/ArticleNavigation';
import AuthorProfile from '@/components/articles/AuthorProfile';

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

  // サイト情報を取得
  const { name: siteName } = mediaId 
    ? await getSiteInfo(mediaId) 
    : { name: 'メディアサイト' };

  // カテゴリー、タグ、ライター、前後の記事、関連記事、全カテゴリーを並行取得
  const [categories, tags, writer, adjacentArticles, relatedArticles, allCategories] = await Promise.all([
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
  ]);
  
  // mediaIdでカテゴリーをフィルタリング
  const headerCategories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;
  
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
    <div className="min-h-screen bg-gray-50">
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

      {/* ヘッダー＆カテゴリーバー */}
      <MediaHeader siteName={siteName} categories={headerCategories} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* パンくずリスト */}
        <Breadcrumbs article={article} category={category} />

        {/* カテゴリー・タグバッジ */}
        <CategoryTagBadges categories={categories} tags={tags} />

        {/* 記事ヘッダー */}
        <ArticleHeader article={article} writer={writer} />

        {/* 読了時間 */}
        {article.readingTime && (
          <div className="mb-6">
            <ReadingTime minutes={article.readingTime} />
          </div>
        )}

        {/* 目次 */}
        {Array.isArray(article.tableOfContents) && article.tableOfContents.length > 0 && (
          <TableOfContents items={article.tableOfContents} />
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

        {/* 著者プロフィール */}
        {writer && <AuthorProfile writer={writer} />}

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
        />

        {/* 関連記事 */}
        {relatedArticles.length > 0 && (
          <RelatedArticles articles={relatedArticles} />
        )}
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">© 2024 Ayumi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
