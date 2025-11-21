import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LANG, SUPPORTED_LANGS, isValidLang } from '@/types/lang';

export function middleware(request: NextRequest) {
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
  
  // パスを分解
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  
  // すでに言語パスが含まれている場合
  if (firstSegment && isValidLang(firstSegment)) {
    // 有効な言語なのでそのまま
    return NextResponse.next();
  }
  
  // 言語パスがない場合、デフォルト言語を追加してリダイレクト
  const newPath = `/${DEFAULT_LANG}${pathname === '/' ? '' : pathname}`;
  const url = request.nextUrl.clone();
  url.pathname = newPath;
  
  return NextResponse.redirect(url);
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
