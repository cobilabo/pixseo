import { NextRequest, NextResponse } from 'next/server';
import { crawlSite } from '@/lib/site-import/crawler';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function compactHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script').remove();
  $('noscript').remove();
  $('svg').html('');
  $('*').each((_, el) => {
    const node = $(el);
    const attribs = (el as any).attribs || {};
    for (const attr of Object.keys(attribs)) {
      if (attr.startsWith('data-') || attr.startsWith('aria-') || attr === 'role' || attr === 'tabindex') {
        node.removeAttr(attr);
      }
    }
  });

  let body = $('body').html() || $.html();
  body = body.replace(/<!--[\s\S]*?-->/g, '');
  body = body.replace(/[ \t]+/g, ' ');
  body = body.replace(/\n\s*\n/g, '\n');
  return body.trim();
}

async function fetchCss(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PixSEO SiteImporter/1.0)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return '';
    const text = await res.text();
    return text;
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, maxPages = 50, maxDepth = 3, excludePaths = [] } = body;

    if (!url) {
      return NextResponse.json({ error: 'URLは必須です' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: '有効なURLを入力してください' }, { status: 400 });
    }

    const result = await crawlSite(url, {
      maxPages,
      maxDepth,
      excludePatterns: [
        'wp-admin', 'wp-login', 'wp-json', '/feed', '.xml', '.pdf', '.zip',
        ...excludePaths.filter((p: string) => p.trim()),
      ],
    });

    // Fetch external CSS files
    const cssContents: string[] = [];
    for (const cssUrl of result.allCssUrls) {
      const css = await fetchCss(cssUrl);
      if (css) cssContents.push(`/* Source: ${cssUrl} */\n${css}`);
    }
    // Include inline CSS
    if (result.inlineCss.length > 0) {
      cssContents.push(`/* Inline CSS */\n${result.inlineCss.join('\n')}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        pageCount: result.pages.length,
        imageCount: result.allImages.length,
        cssCount: result.allCssUrls.length,
        collectedCss: cssContents.join('\n\n'),
        pages: result.pages.map(p => ({
          url: p.url,
          title: p.title,
          metaDescription: p.metaDescription,
          images: p.images,
          bodyHtml: compactHtml(p.html),
        })),
      },
    });
  } catch (error: any) {
    console.error('[API site-import/crawl] Error:', error);
    return NextResponse.json(
      { error: error.message || 'クロール中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
