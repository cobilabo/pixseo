import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LANG, isValidLang } from '@/types/lang';

// 認証情報のキャッシュ（メモリ内、サーバーリスタートでクリア）
const authCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1分

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
  
  // WordPress旧URL形式のリダイレクト（301 Permanent Redirect）
  const wpRedirect = handleWordPressRedirect(pathname);
  if (wpRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = wpRedirect;
    return NextResponse.redirect(url, { status: 301 });
  }
  
  // パスを分解
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  
  // すでに言語パスが含まれている場合
  if (firstSegment && isValidLang(firstSegment)) {
    // /[lang]/home → /[lang] にリダイレクト（home固定ページは / で表示）
    if (pathSegments[1] === 'home') {
      const url = request.nextUrl.clone();
      url.pathname = `/${firstSegment}`;
      return NextResponse.redirect(url, { status: 301 });
    }
    return NextResponse.next();
  }
  
  // 言語パスがない場合、デフォルト言語を追加してリダイレクト（301: SEO評価引き継ぎ）
  const newPath = `/${DEFAULT_LANG}${pathname === '/' ? '' : pathname}`;
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

/**
 * 記事スラグの旧→新リダイレクトマッピング
 * Firestore に既に格納されている誤った slug を一括で正規化するための互換層。
 * 該当記事は管理画面/Firestore 側で slug を新値に更新したうえで、本マップを残しておくことで
 * 既にインデックスされている旧 URL からの 301 リダイレクトを保証する。
 *
 * key: 旧 slug（誤った値）
 * value: 新 slug
 */
const ARTICLE_SLUG_REDIRECTS: Record<string, string> = {
  // タイポ: "sightseeingrip" が混入していた記事群（"sightseeingrip" は意味不明な誤入力）
  'trip-sightseeingrip-sightseeing-accessible-tourism': 'trip-sightseeing-accessible-tourism',
  'trip-sightseeingrip-rental-welfare-vehicles': 'trip-rental-welfare-vehicles',
  // 「【車椅子やバギーユーザーも楽しむ】大阪万博」記事。
  // 'trip-sightseeing-osaka-expo' は別記事 (「大阪万博を障害者は楽しめるか」) に
  // 既に使用されているため、衝突回避のため別 slug 'trip-osaka-expo-experience' を採用。
  'trip-sightseeingrip-sightseeing-osaka-expo': 'trip-osaka-expo-experience',
};

/**
 * WordPress旧URL形式を新URL形式にリダイレクト
 * @returns 新しいパス（リダイレクトが必要な場合）またはnull
 */
function handleWordPressRedirect(pathname: string): string | null {
  // 記事スラグの旧→新リダイレクト: /[lang]/articles/<old-slug>/ → /[lang]/articles/<new-slug>/
  const localizedArticleMatch = pathname.match(/^\/([a-z]{2})\/articles\/([^/]+)\/?$/);
  if (localizedArticleMatch) {
    const lang = localizedArticleMatch[1];
    const slug = localizedArticleMatch[2];
    if (slug in ARTICLE_SLUG_REDIRECTS) {
      return `/${lang}/articles/${ARTICLE_SLUG_REDIRECTS[slug]}`;
    }
  }

  // 記事: /YYYY/MM/DD/slug/ → /ja/articles/slug（slug 自体が旧→新マップに該当する場合は新 slug へ）
  const articleMatch = pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/?$/);
  if (articleMatch) {
    const slug = articleMatch[4];
    const targetSlug = ARTICLE_SLUG_REDIRECTS[slug] || slug;
    return `/${DEFAULT_LANG}/articles/${targetSlug}`;
  }
  
  // カテゴリー: /category/slug/ or /category/parent/child/ → /ja/categories/slug
  const categoryMatch = pathname.match(/^\/category\/(?:[^/]+\/)*([^/]+)\/?$/);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    return `/${DEFAULT_LANG}/categories/${slug}`;
  }
  
  // タグ: /tag/slug/ → /ja/tags/slug
  const tagMatch = pathname.match(/^\/tag\/([^/]+)\/?$/);
  if (tagMatch) {
    const slug = tagMatch[1];
    return `/${DEFAULT_LANG}/tags/${slug}`;
  }
  
  // 著者: /author/slug/ → /ja/writers/slug
  const authorMatch = pathname.match(/^\/author\/([^/]+)\/?$/);
  if (authorMatch) {
    const slug = authorMatch[1];
    return `/${DEFAULT_LANG}/writers/${slug}`;
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
