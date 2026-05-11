import { MetadataRoute } from 'next';
import { getArticleSlugsForSitemap } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getTagsServer } from '@/lib/firebase/tags-server';
import { SUPPORTED_LANGS } from '@/types/lang';

/**
 * ISR: 1時間ごとに再生成（sitemap は頻繁に更新する必要がないため）。
 *
 * NOTE: 以前は `getSiteOrigin()` で `headers()` を経由していたため Next.js が Dynamic Rendering
 * 扱いとし、Vercel CDN に全くキャッシュされずに毎リクエストで Firestore (1700 件超) に
 * クエリが走っていた (`X-VERCEL-CACHE: MISS` が常時)。
 * sitemap.xml は単一ドメイン専用 (vercel.json で `NEXT_PUBLIC_SITE_URL` 固定) なので
 * `headers()` を使わず env から直接解決することで Static Rendering 扱いに戻し、
 * ISR (revalidate=3600) と Vercel CDN キャッシュを有効化する。
 */
export const revalidate = 3600;

const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://the-ayumi.jp').replace(/\/+$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = SITE_ORIGIN;

  const [articles, categories, tags] = await Promise.all([
    getArticleSlugsForSitemap({ limit: 5000 }),
    getCategoriesServer(),
    getTagsServer(),
  ]);

  const sitemapEntries: MetadataRoute.Sitemap = [];
  const now = new Date();

  // 静的ページ（各言語ごと）
  SUPPORTED_LANGS.forEach(lang => {
    sitemapEntries.push({
      url: `${origin}/${lang}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: Object.fromEntries(
          SUPPORTED_LANGS.map(l => [l, `${origin}/${l}`])
        ),
      },
    });

    sitemapEntries.push({
      url: `${origin}/${lang}/articles`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(
          SUPPORTED_LANGS.map(l => [l, `${origin}/${l}/articles`])
        ),
      },
    });

    sitemapEntries.push({
      url: `${origin}/${lang}/search`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
      alternates: {
        languages: Object.fromEntries(
          SUPPORTED_LANGS.map(l => [l, `${origin}/${l}/search`])
        ),
      },
    });
  });

  // 記事ページ（各言語ごと）
  articles.forEach(article => {
    if (!article.slug) return;
    SUPPORTED_LANGS.forEach(lang => {
      sitemapEntries.push({
        url: `${origin}/${lang}/articles/${article.slug}`,
        lastModified: article.updatedAt || article.publishedAt || now,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            SUPPORTED_LANGS.map(l => [l, `${origin}/${l}/articles/${article.slug}`])
          ),
        },
      });
    });
  });

  // カテゴリーページ（各言語ごと）
  categories.forEach(category => {
    if (!category.slug) return;
    SUPPORTED_LANGS.forEach(lang => {
      sitemapEntries.push({
        url: `${origin}/${lang}/categories/${category.slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            SUPPORTED_LANGS.map(l => [l, `${origin}/${l}/categories/${category.slug}`])
          ),
        },
      });
    });
  });

  // タグページ（各言語ごと）
  tags.forEach(tag => {
    if (!tag.slug) return;
    SUPPORTED_LANGS.forEach(lang => {
      sitemapEntries.push({
        url: `${origin}/${lang}/tags/${tag.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
        alternates: {
          languages: Object.fromEntries(
            SUPPORTED_LANGS.map(l => [l, `${origin}/${l}/tags/${tag.slug}`])
          ),
        },
      });
    });
  });

  return sitemapEntries;
}
