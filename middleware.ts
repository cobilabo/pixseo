import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  console.log('[Middleware] Request:', { hostname, pathname });

  // 静的ファイルやNext.js内部パスはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 管理画面ドメインの場合、ルートを /admin にリダイレクト
  if (hostname === 'admin.pixseo.cloud' || hostname === 'pixseo-lovat.vercel.app') {
    // /admin 配下のパスはそのまま
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      return NextResponse.next();
    }
    
    // ルートアクセスの場合は /admin にリダイレクト
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    
    // その他のパスは /admin 配下にrewrite
    if (!pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
    
    return NextResponse.next();
  }

  // サービスドメイン（{slug}.pixseo.cloud）の場合
  if (hostname.endsWith('.pixseo.cloud') && hostname !== 'admin.pixseo.cloud') {
    try {
      // スラッグを抽出
      const slug = hostname.replace('.pixseo.cloud', '');
      console.log('[Middleware] Service domain detected:', { slug, hostname });

      // /media 配下のパスはそのまま
      if (pathname.startsWith('/media')) {
        // ドメインからmediaIdを取得
        const mediaId = await getMediaIdBySlug(slug);
        
        if (!mediaId) {
          console.log('[Middleware] No media found for slug:', slug);
          return NextResponse.next();
        }

        console.log('[Middleware] Media ID found:', mediaId);

        // レスポンスヘッダーにmediaIdを追加
        const response = NextResponse.next();
        response.headers.set('x-media-id', mediaId);
        
        return response;
      }

      // ルートアクセスの場合は /media にrewrite
      if (pathname === '/' || pathname === '') {
        const mediaId = await getMediaIdBySlug(slug);
        
        if (!mediaId) {
          console.log('[Middleware] No media found for slug:', slug);
          // 404ページを表示
          return new NextResponse('Service not found', { status: 404 });
        }

        const url = request.nextUrl.clone();
        url.pathname = '/media';
        
        const response = NextResponse.rewrite(url);
        response.headers.set('x-media-id', mediaId);
        
        return response;
      }

      // その他のパスは /media 配下にrewrite
      if (!pathname.startsWith('/media')) {
        const mediaId = await getMediaIdBySlug(slug);
        
        if (!mediaId) {
          console.log('[Middleware] No media found for slug:', slug);
          return new NextResponse('Service not found', { status: 404 });
        }

        const url = request.nextUrl.clone();
        url.pathname = `/media${pathname}`;
        
        const response = NextResponse.rewrite(url);
        response.headers.set('x-media-id', mediaId);
        
        return response;
      }
    } catch (error) {
      console.error('[Middleware] Error:', error);
      return NextResponse.next();
    }
  }

  // その他のドメイン（開発環境など）
  return NextResponse.next();
}

// スラッグからmediaIdを取得する関数
async function getMediaIdBySlug(slug: string): Promise<string | null> {
  try {
    console.log('[Middleware] Looking up media ID for slug:', slug);

    // Firestore REST APIを使用してサービス情報を取得
    // セキュリティルールで公開読み取りが許可されているため、認証不要
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!projectId) {
      console.error('[Middleware] Firebase project ID not found');
      return null;
    }

    // Firestore REST API エンドポイント
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/mediaTenants`;
    
    console.log('[Middleware] Fetching from Firestore REST API');
    
    try {
      const response = await fetch(`${firestoreUrl}?pageSize=1000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Edge Runtimeではnextオプションが使えない
      });

      if (!response.ok) {
        console.error('[Middleware] Firestore API error:', response.status, await response.text());
        return null;
      }

      const data = await response.json();
      
      console.log('[Middleware] Firestore response:', JSON.stringify(data).substring(0, 200));
      
      // ドキュメントからスラッグに一致するものを検索
      if (data.documents) {
        for (const doc of data.documents) {
          const docSlug = doc.fields?.slug?.stringValue;
          console.log('[Middleware] Checking slug:', docSlug);
          if (docSlug === slug) {
            // ドキュメントIDを抽出
            const docPath = doc.name;
            const mediaId = docPath.split('/').pop();
            console.log('[Middleware] Found media ID:', mediaId);
            return mediaId || null;
          }
        }
      } else {
        console.log('[Middleware] No documents in response');
      }

      console.log('[Middleware] No media found for slug:', slug);
      return null;
    } catch (fetchError) {
      console.error('[Middleware] Error fetching from Firestore:', fetchError);
      return null;
    }
  } catch (error) {
    console.error('[Middleware] Error in getMediaIdBySlug:', error);
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

