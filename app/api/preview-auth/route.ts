import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * プレビューサイトのベーシック認証情報を取得
 * GET /api/preview-auth?slug=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }
    
    // slugからサービスを検索
    const snapshot = await adminDb.collection('mediaTenants')
      .where('slug', '==', slug)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return NextResponse.json({ 
        enabled: false,
        message: 'Service not found'
      });
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    const previewAuth = data.previewAuth;
    
    // 認証設定がない、または無効の場合
    if (!previewAuth || !previewAuth.enabled) {
      return NextResponse.json({ enabled: false });
    }
    
    // 認証設定を返す（パスワードは含める - Middleware側で検証するため）
    return NextResponse.json({
      enabled: true,
      username: previewAuth.username,
      password: previewAuth.password,
    });
    
  } catch (error) {
    console.error('[Preview Auth API] Error:', error);
    return NextResponse.json({ 
      enabled: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

