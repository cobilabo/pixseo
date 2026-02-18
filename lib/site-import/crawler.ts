import * as cheerio from 'cheerio';

export interface CrawledPage {
  url: string;
  html: string;
  title: string;
  metaDescription: string;
  images: string[];
  cssLinks: string[];
}

export interface CrawlResult {
  pages: CrawledPage[];
  allImages: string[];
  allCssUrls: string[];
  inlineCss: string[];
  baseUrl: string;
}

interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  excludePatterns?: string[];
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return '';
  }
}

function isSameDomain(baseUrl: string, targetUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const target = new URL(targetUrl);
    return base.hostname === target.hostname;
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    let path = u.pathname;
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    u.pathname = path;
    return u.href;
  } catch {
    return url;
  }
}

function shouldExclude(url: string, patterns: string[]): boolean {
  const path = new URL(url).pathname.toLowerCase();
  return patterns.some(p => path.includes(p.toLowerCase()));
}

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PixSEO SiteImporter/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }

    const html = await response.text();
    return { html, finalUrl: response.url };
  } catch {
    return null;
  }
}

function extractPageData(url: string, html: string, baseUrl: string): CrawledPage {
  const $ = cheerio.load(html);

  // Remove script tags to clean up HTML
  $('script').remove();

  const title = $('title').text().trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';

  const images: Set<string> = new Set();
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveUrl(url, src);
      if (resolved) images.add(resolved);
    }
    const srcset = $(el).attr('srcset');
    if (srcset) {
      srcset.split(',').forEach(entry => {
        const src = entry.trim().split(/\s+/)[0];
        if (src) {
          const resolved = resolveUrl(url, src);
          if (resolved) images.add(resolved);
        }
      });
    }
  });

  // Also extract background images from inline styles
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const bgMatches = style.match(/url\(['"]?([^'")\s]+)['"]?\)/g);
    if (bgMatches) {
      bgMatches.forEach(match => {
        const urlMatch = match.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (urlMatch?.[1]) {
          const resolved = resolveUrl(url, urlMatch[1]);
          if (resolved) images.add(resolved);
        }
      });
    }
  });

  const cssLinks: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const resolved = resolveUrl(url, href);
      if (resolved) cssLinks.push(resolved);
    }
  });

  return {
    url,
    html: $.html() || html,
    title,
    metaDescription,
    images: Array.from(images),
    cssLinks,
  };
}

function extractLinks(html: string, currentUrl: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: Set<string> = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

    const resolved = resolveUrl(currentUrl, href);
    if (resolved && isSameDomain(baseUrl, resolved)) {
      links.add(normalizeUrl(resolved));
    }
  });

  return Array.from(links);
}

export async function crawlSite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawlResult> {
  const {
    maxPages = 30,
    maxDepth = 3,
    excludePatterns = ['wp-admin', 'wp-login', 'wp-json', '/feed', '.xml', '.pdf', '.zip', '/tag/', '/page/'],
  } = options;

  const baseUrl = new URL(startUrl).origin;
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: normalizeUrl(startUrl), depth: 0 }];
  const pages: CrawledPage[] = [];
  const allImages = new Set<string>();
  const allCssUrls = new Set<string>();
  const inlineCss: string[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift();
    if (!current) break;

    const normalized = normalizeUrl(current.url);
    if (visited.has(normalized)) continue;
    if (shouldExclude(normalized, excludePatterns)) continue;

    visited.add(normalized);

    const result = await fetchPage(current.url);
    if (!result) continue;

    const pageData = extractPageData(result.finalUrl, result.html, baseUrl);
    pages.push(pageData);

    pageData.images.forEach(img => allImages.add(img));
    pageData.cssLinks.forEach(css => allCssUrls.add(css));

    // Extract inline CSS
    const $ = cheerio.load(result.html);
    $('style').each((_, el) => {
      const css = $(el).html()?.trim();
      if (css && css.length > 0) {
        inlineCss.push(css);
      }
    });

    if (current.depth < maxDepth) {
      const links = extractLinks(result.html, result.finalUrl, baseUrl);
      for (const link of links) {
        if (!visited.has(normalizeUrl(link))) {
          queue.push({ url: link, depth: current.depth + 1 });
        }
      }
    }
  }

  return {
    pages,
    allImages: Array.from(allImages),
    allCssUrls: Array.from(allCssUrls),
    inlineCss,
    baseUrl,
  };
}
