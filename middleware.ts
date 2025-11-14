import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // 静的ファイルやNext.js内部パスはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 管理画面ドメインの場合
  if (hostname === 'admin.pixseo.cloud' || hostname === 'pixseo-lovat.vercel.app') {
    // APIやadmin-panelで始まるパスはそのまま
    if (pathname.startsWith('/api') || pathname.startsWith('/admin-panel')) {
      return NextResponse.next();
    }
    
    // それ以外のパスは /admin-panel/* にrewrite
    const url = request.nextUrl.clone();
    url.pathname = `/admin-panel${pathname}`;
    return NextResponse.rewrite(url);
  }

  // サービスドメイン（{slug}.pixseo.cloud）の場合
  if (hostname.endsWith('.pixseo.cloud') && hostname !== 'admin.pixseo.cloud') {
    try {
      // スラッグを抽出
      const slug = hostname.replace('.pixseo.cloud', '');
      const mediaId = await getMediaIdBySlug(slug);
      
      if (!mediaId) {
        return new NextResponse('Service not found', { status: 404 });
      }

      // /media 配下のパスをチェック
      if (pathname.startsWith('/media')) {
        // ルート /media または /media/ への直接アクセスは / にリダイレクト
        if (pathname === '/media' || pathname === '/media/') {
          const url = request.nextUrl.clone();
          url.pathname = '/';
          return NextResponse.redirect(url, 301); // 永久リダイレクト
        }
        
        // /media/search/, /media/articles/ などは /media を削除してリダイレクト
        if (pathname.startsWith('/media/')) {
          const url = request.nextUrl.clone();
          url.pathname = pathname.replace('/media', ''); // /media を削除
          return NextResponse.redirect(url, 301); // 永久リダイレクト
        }
        
        // その他の /media/* パスはそのまま（内部パス用）
        const response = NextResponse.next();
        response.headers.set('x-media-id', mediaId);
        return response;
      }

      // ルートアクセスの場合は /media にrewrite
      if (pathname === '/' || pathname === '') {
        const url = request.nextUrl.clone();
        url.pathname = '/media';
        
        const response = NextResponse.rewrite(url);
        response.headers.set('x-media-id', mediaId);
        
        return response;
      }

      // その他のパス（/articles/, /search など）は /media 配下にrewrite
      const url = request.nextUrl.clone();
      url.pathname = `/media${pathname}`;
      
      const response = NextResponse.rewrite(url);
      response.headers.set('x-media-id', mediaId);
      
      return response;
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
    // Firestore REST APIを使用してサービス情報を取得
    // セキュリティルールで公開読み取りが許可されているため、認証不要
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!projectId) {
      console.error('[Middleware] Firebase project ID not found');
      return null;
    }

    // Firestore REST API エンドポイント
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/mediaTenants`;
    
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
      
      // ドキュメントからスラッグに一致するものを検索
      if (data.documents) {
        for (const doc of data.documents) {
          const docSlug = doc.fields?.slug?.stringValue;
          if (docSlug === slug) {
            // ドキュメントIDを抽出
            const docPath = doc.name;
            const mediaId = docPath.split('/').pop();
            return mediaId || null;
          }
        }
      }

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

