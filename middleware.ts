import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LANG, isValidLang } from '@/types/lang';
import { ARTICLE_SLUG_REDIRECTS } from '@/lib/wp-slug-redirects';
import { resolveAyumiSitePath } from '@/lib/fix-internal-links';

// 認証情報のキャッシュ（メモリ内、サーバーリスタートでクリア）
const authCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1分

/**
 * next.config.js の `trailingSlash: true` に合わせて、リダイレクト先パスに
 * 必ず末尾スラッシュを付与するヘルパー。
 *
 * これを使わないと
 *   /articles/foo → 301 → /ja/articles/foo → 308 → /ja/articles/foo/
 * のように 2 hop の chain になり、Google Search Console の
 * 「ページにリダイレクトがあります」を不必要に増やすため、必ず 1 hop で
 * 終わるよう全リダイレクトを末尾スラッシュ付きに揃える。
 */
function withTrailingSlash(path: string): string {
  if (!path) return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * ベーシック認証のチェック
 */
async function checkBasicAuth(request: NextRequest, slug: string): Promise<NextResponse | null> {
  try {
    // キャッシュをチェック
    const cached = authCache.get(slug);
    const now = Date.now();
    
    let authConfig: { enabled: boolean; username?: string; password?: string };
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      authConfig = cached.data;
    } else {
      // APIから認証設定を取得
      const protocol = request.nextUrl.protocol;
      const host = request.headers.get('host') || request.nextUrl.host;
      const apiUrl = `${protocol}//${host}/api/preview-auth?slug=${encodeURIComponent(slug)}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('[Middleware] Failed to fetch auth config:', response.status);
        return null; // エラー時は認証スキップ
      }
      
      authConfig = await response.json();
      
      // キャッシュに保存
      authCache.set(slug, { data: authConfig, timestamp: now });
    }
    
    // 認証が無効の場合
    if (!authConfig.enabled) {
      return null;
    }
    
    // Authorizationヘッダーをチェック
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      // 認証ダイアログを表示
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Preview Site"',
        },
      });
    }
    
    // Base64デコードして検証
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    if (username === authConfig.username && password === authConfig.password) {
      return null; // 認証成功
    }
    
    // 認証失敗
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Preview Site"',
      },
    });
    
  } catch (error) {
    console.error('[Middleware] Auth check error:', error);
    return null; // エラー時は認証スキップ
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.nextUrl.hostname;
  
  // WordPress 旧メディアパス (拡張子付き .png 等を含む):
  // 下の「pathname.includes('.')」判定より前に処理しないと middleware を素通りし、
  // WAF bypass 通過後も 404 になる。GSC がクロールする旧画像 URL は 301 で /ja/ へ。
  if (/^\/(wp-content|wp-includes)\//i.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = withTrailingSlash(`/${DEFAULT_LANG}`);
    return NextResponse.redirect(url, { status: 301 });
  }
  
  // 静的ファイルやAPIルートは除外
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // .svg, .png, .jpg等
  ) {
    return NextResponse.next();
  }
  
  // プレビューサイト（*.pixseo-preview.cloud）の場合、ベーシック認証をチェック
  if (hostname.endsWith('.pixseo-preview.cloud') && !hostname.startsWith('admin.')) {
    const slug = hostname.replace('.pixseo-preview.cloud', '');
    const authResponse = await checkBasicAuth(request, slug);
    if (authResponse) {
      return authResponse;
    }
  }
  
  // admin.pixseo.cloudサブドメインの場合、/admin/にリライト
  if (hostname.startsWith('admin.') && !pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }
  
  // 管理画面パスは言語リダイレクトから除外
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }
  
  // 本文内の誤リンク: /ja/articles/{slug}/instagram.com/... → 外部 URL へ
  const embeddedExternal = pathname.match(
    /^\/(ja|en|zh|ko)\/articles\/[^/]+\/((?:instagram\.com|www\.[^/]+).+)$/i
  );
  if (embeddedExternal) {
    const tail = embeddedExternal[2].replace(/\/$/, '');
    const target = tail.startsWith('http') ? tail : `https://${tail}`;
    return NextResponse.redirect(target, { status: 301 });
  }

  // WordPress旧URL形式のリダイレクト（301 Permanent Redirect）
  const wpRedirect = handleWordPressRedirect(pathname);
  if (wpRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = withTrailingSlash(wpRedirect);
    return NextResponse.redirect(url, { status: 301 });
  }
  
  // パスを分解
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  
  // すでに言語パスが含まれている場合
  if (firstSegment && isValidLang(firstSegment)) {
    // /[lang]/home → /[lang]/ にリダイレクト（home固定ページは / で表示）
    if (pathSegments[1] === 'home') {
      const url = request.nextUrl.clone();
      url.pathname = withTrailingSlash(`/${firstSegment}`);
      return NextResponse.redirect(url, { status: 301 });
    }
    return NextResponse.next();
  }
  
  // 言語パスがない場合、デフォルト言語を追加してリダイレクト（301: SEO評価引き継ぎ）
  // 末尾スラッシュを必ず付与して、Next.js trailingSlash による追加 308 を防ぐ。
  const newPath = withTrailingSlash(
    pathname === '/' ? `/${DEFAULT_LANG}` : `/${DEFAULT_LANG}${pathname}`
  );
  const url = request.nextUrl.clone();
  url.pathname = newPath;
  
  return NextResponse.redirect(url, { status: 301 });
}

/**
 * WordPress固定ページのリダイレクトマッピング
 * key: WordPress側のパス（先頭・末尾スラッシュなし）
 * value: 新サイトのスラッグ（空文字の場合はホームへリダイレクト）
 */
const WP_PAGE_REDIRECTS: Record<string, string> = {
  'recruitment-information/occupation': 'recruitment-occupation',
  'recruitment-information/seeking-person': 'recruitment-seeking-person',
  'recruitment-information/organizational-culture': 'recruitment-organizational-culture',
  'service-lp': 'service',
  'verified-locations': 'verified-locations-map',
  'barrier-free-how-to-take-photos': '',
  'customer-service-guidebook': 'service',
  'challenger': 'media',
  'list': 'media',
  'ayumi-info': '',
  'web-writer-introduction': 'media',
  'adviser': '',
  'barrierfree-fand-explanation': '',
};

const LINK_CTX = { defaultLang: DEFAULT_LANG as const, articleSlugs: new Set<string>() };

function resolveArticleSlugRedirect(slug: string): string {
  const candidates = [slug];
  try {
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) candidates.push(decoded);
  } catch {
    /* malformed % sequence */
  }
  for (const s of candidates) {
    if (s in ARTICLE_SLUG_REDIRECTS) return ARTICLE_SLUG_REDIRECTS[s];
  }
  return slug;
}

/**
 * WordPress旧URL形式を新URL形式にリダイレクト
 * @returns 新しいパス（リダイレクトが必要な場合）またはnull
 */
function handleWordPressRedirect(pathname: string): string | null {
  // 本文リンク壊れ: /ja/articles/{slug}/the-ayumi.jp/2024/01/04/foo/
  const embeddedAyumi = pathname.match(
    /^\/(ja|en|zh|ko)\/articles\/[^/]+\/the-ayumi\.jp\/(.+)$/i
  );
  if (embeddedAyumi) {
    return resolveAyumiSitePath(embeddedAyumi[2], LINK_CTX).replace(/\/$/, '') || `/${DEFAULT_LANG}`;
  }

  // 言語付き記事パスにゴミセグメント（the-ayumi.jp 以外の誤結合）
  const garbageArticle = pathname.match(
    /^\/(ja|en|zh|ko)\/articles\/[^/]+\/(URL|the-ayumi\.jp)\/?$/i
  );
  if (garbageArticle) {
    return `/${garbageArticle[1]}`;
  }
  // 記事スラグの旧→新リダイレクト: /[lang]/articles/<old-slug>/ → /[lang]/articles/<new-slug>/
  const localizedArticleMatch = pathname.match(/^\/([a-z]{2})\/articles\/([^/]+)\/?$/);
  if (localizedArticleMatch) {
    const lang = localizedArticleMatch[1];
    const slug = localizedArticleMatch[2];
    const targetSlug = resolveArticleSlugRedirect(slug);
    if (targetSlug !== slug) {
      return `/${lang}/articles/${targetSlug}`;
    }
  }

  // 記事フィード: /YYYY/MM/DD/slug/feed/ → 記事ページへ
  const articleFeedMatch = pathname.match(
    /^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/feed\/?$/
  );
  if (articleFeedMatch) {
    const slug = articleFeedMatch[4];
    const targetSlug = resolveArticleSlugRedirect(slug);
    return `/${DEFAULT_LANG}/articles/${targetSlug}`;
  }

  // 記事: /YYYY/MM/DD/slug/ → /ja/articles/slug（slug 自体が旧→新マップに該当する場合は新 slug へ）
  const articleMatch = pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/?$/);
  if (articleMatch) {
    const slug = articleMatch[4];
    const targetSlug = resolveArticleSlugRedirect(slug);
    return `/${DEFAULT_LANG}/articles/${targetSlug}`;
  }

  // 言語なし旧記事: /articles/slug/ → /ja/articles/slug
  const legacyArticleMatch = pathname.match(/^\/articles\/([^/]+)\/?$/);
  if (legacyArticleMatch) {
    const slug = legacyArticleMatch[1];
    const targetSlug = resolveArticleSlugRedirect(slug);
    return `/${DEFAULT_LANG}/articles/${targetSlug}`;
  }

  // 著者: ページネーション・フィード → 著者ページ（存在しなければ先で 404）
  const authorPageMatch = pathname.match(/^\/author\/([^/]+)\/page\/\d+\/?$/);
  if (authorPageMatch) {
    return `/${DEFAULT_LANG}/writers/${authorPageMatch[1]}`;
  }
  const authorFeedMatch = pathname.match(/^\/author\/([^/]+)\/feed\/?$/);
  if (authorFeedMatch) {
    return `/${DEFAULT_LANG}/writers/${authorFeedMatch[1]}`;
  }

  // 著者: /author/slug/ → /ja/writers/slug
  const authorMatch = pathname.match(/^\/author\/([^/]+)\/?$/);
  if (authorMatch) {
    const slug = authorMatch[1];
    return `/${DEFAULT_LANG}/writers/${slug}`;
  }

  // タグ: ページネーション・フィード → タグページ
  const tagPageMatch = pathname.match(/^\/tag\/([^/]+)\/page\/\d+\/?$/);
  if (tagPageMatch) {
    return `/${DEFAULT_LANG}/tags/${tagPageMatch[1]}`;
  }
  const tagFeedMatch = pathname.match(/^\/tag\/([^/]+)\/feed\/?$/);
  if (tagFeedMatch) {
    return `/${DEFAULT_LANG}/tags/${tagFeedMatch[1]}`;
  }
  if (/^\/tag\/?$/.test(pathname)) {
    return `/${DEFAULT_LANG}`;
  }

  // タグ: /tag/slug/ → /ja/tags/slug
  const tagMatch = pathname.match(/^\/tag\/([^/]+)\/?$/);
  if (tagMatch) {
    const slug = tagMatch[1];
    return `/${DEFAULT_LANG}/tags/${slug}`;
  }

  // カテゴリー: ページネーション・フィード → カテゴリーページ（末尾セグメントを slug に）
  const categoryPageMatch = pathname.match(/^\/category\/(?:.+\/)?([^/]+)\/page\/\d+\/?$/);
  if (categoryPageMatch) {
    return `/${DEFAULT_LANG}/categories/${categoryPageMatch[1]}`;
  }
  const categoryFeedMatch = pathname.match(/^\/category\/(?:.+\/)?([^/]+)\/feed\/?$/);
  if (categoryFeedMatch) {
    return `/${DEFAULT_LANG}/categories/${categoryFeedMatch[1]}`;
  }

  // カテゴリー: /category/slug/ or /category/parent/child/ → /ja/categories/slug
  const categoryMatch = pathname.match(/^\/category\/(?:[^/]+\/)*([^/]+)\/?$/);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    return `/${DEFAULT_LANG}/categories/${slug}`;
  }

  // 旧 /categories/slug（言語なし）→ /ja/categories/slug
  const legacyCategoryMatch = pathname.match(/^\/categories\/([^/]+)\/?$/);
  if (legacyCategoryMatch) {
    return `/${DEFAULT_LANG}/categories/${legacyCategoryMatch[1]}`;
  }

  // 旧 /tags/slug（言語なし）→ /ja/tags/slug
  const legacyTagsMatch = pathname.match(/^\/tags\/([^/]+)\/?$/);
  if (legacyTagsMatch) {
    return `/${DEFAULT_LANG}/tags/${legacyTagsMatch[1]}`;
  }

  // /media/ 単体（旧 WP パス）→ トップ
  if (/^\/media\/?$/.test(pathname)) {
    return `/${DEFAULT_LANG}`;
  }
  
  // ページネーション: /page/N/ → トップへ
  if (/^\/page\/\d+\/?$/.test(pathname)) {
    return `/${DEFAULT_LANG}`;
  }
  
  // フィード: /feed/, /rss/ → トップへ
  if (/^\/(feed|rss)\/?$/.test(pathname)) {
    return `/${DEFAULT_LANG}`;
  }
  
  // WP管理系: /wp-admin/, /wp-login.php → トップへ
  if (/^\/(wp-admin|wp-login\.php)/.test(pathname)) {
    return `/${DEFAULT_LANG}`;
  }
  
  // WPコンテンツ: /wp-content/, /wp-includes/ → トップへ
  if (/^\/(wp-content|wp-includes)\//.test(pathname)) {
    return `/${DEFAULT_LANG}`;
  }
  
  // WordPress固定ページ: スラッグ変更・ネストページ・削除ページの明示的リダイレクト
  const cleanPath = pathname.replace(/^\/|\/$/g, '');
  if (cleanPath in WP_PAGE_REDIRECTS) {
    const newSlug = WP_PAGE_REDIRECTS[cleanPath];
    return newSlug ? `/${DEFAULT_LANG}/${newSlug}` : `/${DEFAULT_LANG}`;
  }
  
  return null;
}

export const config = {
  // 管理画面とAPIを除外
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /admin (admin routes)
     * 5. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|_static|admin|[\\w-]+\\.\\w+).*)',
  ],
};
