import { MetadataRoute } from 'next';
import { getArticleSlugsForSitemap } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getTagsServer } from '@/lib/firebase/tags-server';
import {
  getPublishedCategoryIdsSet,
  getPublishedTagIdsSet,
} from '@/lib/firebase/published-taxonomy';
import { getPublishedPageSlugsForSitemap } from '@/lib/firebase/pages-server';
import { getMediaIdFromDomain } from '@/lib/firebase/media-tenant-helper';
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

/** アプリの予約パス。固定ページとしてサイトマップに載せない */
const RESERVED_PAGE_SLUGS = new Set([
  'home',
  'articles',
  'search',
  'categories',
  'tags',
  'writers',
  'admin',
  'api',
]);

function withTrailingSlash(path: string): string {
  if (!path) return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

function absUrl(path: string): string {
  return `${SITE_ORIGIN}${withTrailingSlash(path)}`;
}

function langAlternates(pathAfterLang: string): Record<string, string> {
  const suffix = pathAfterLang
    ? withTrailingSlash(pathAfterLang.startsWith('/') ? pathAfterLang : `/${pathAfterLang}`)
    : '/';
  return Object.fromEntries(
    SUPPORTED_LANGS.map(l => [l, absUrl(`/${l}${suffix === '/' ? '/' : suffix}`)])
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mediaHost = new URL(SITE_ORIGIN).hostname;
  const mediaId =
    (await getMediaIdFromDomain(mediaHost)) ||
    (await getMediaIdFromDomain('the-ayumi.jp'));

  const [articles, categories, tags, publishedTagIds, publishedCategoryIds, pages] =
    await Promise.all([
      getArticleSlugsForSitemap({ limit: 5000, mediaId: mediaId || undefined }),
      getCategoriesServer().catch(() => []),
      getTagsServer().catch(() => []),
      getPublishedTagIdsSet().catch(() => new Set<string>()),
      getPublishedCategoryIdsSet().catch(() => new Set<string>()),
      mediaId ? getPublishedPageSlugsForSitemap(mediaId) : Promise.resolve([]),
    ]);

  const sitemapEntries: MetadataRoute.Sitemap = [];
  const now = new Date();

  SUPPORTED_LANGS.forEach(lang => {
    sitemapEntries.push({
      url: absUrl(`/${lang}`),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: langAlternates(''),
      },
    });

    sitemapEntries.push({
      url: absUrl(`/${lang}/articles`),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: langAlternates('/articles'),
      },
    });
  });

  const pageNow = now;
  pages.forEach(page => {
    if (!page.slug || RESERVED_PAGE_SLUGS.has(page.slug) || page.isHomePage) return;
    if (page.publishedAt && page.publishedAt > pageNow) return;
    SUPPORTED_LANGS.forEach(lang => {
      sitemapEntries.push({
        url: absUrl(`/${lang}/${page.slug}`),
        lastModified: page.updatedAt || page.publishedAt || now,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: {
          languages: langAlternates(`/${page.slug}`),
        },
      });
    });
  });

  articles.forEach(article => {
    if (!article.slug) return;
    SUPPORTED_LANGS.forEach(lang => {
      sitemapEntries.push({
        url: absUrl(`/${lang}/articles/${article.slug}`),
        lastModified: article.updatedAt || article.publishedAt || now,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: {
          languages: langAlternates(`/articles/${article.slug}`),
        },
      });
    });
  });

  categories.forEach(category => {
    if (!category.slug || !publishedCategoryIds.has(category.id)) return;
    SUPPORTED_LANGS.forEach(lang => {
      sitemapEntries.push({
        url: absUrl(`/${lang}/categories/${category.slug}`),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.6,
        alternates: {
          languages: langAlternates(`/categories/${category.slug}`),
        },
      });
    });
  });

  tags.forEach(tag => {
    if (!tag.slug || !publishedTagIds.has(tag.id)) return;
    SUPPORTED_LANGS.forEach(lang => {
      sitemapEntries.push({
        url: absUrl(`/${lang}/tags/${tag.slug}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
        alternates: {
          languages: langAlternates(`/tags/${tag.slug}`),
        },
      });
    });
  });

  return sitemapEntries;
}
