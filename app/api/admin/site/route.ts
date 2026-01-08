import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

// サイト設定取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }
    
    const doc = await adminDb.collection('mediaTenants').doc(mediaId).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Media tenant not found' }, { status: 404 });
    }
    
    const data = doc.data();
    return NextResponse.json({
      siteName: data?.name || '',
      siteDescription: data?.siteDescription || '', // トップレベルから取得
      logoUrl: data?.settings?.logos?.square || '',
      allowIndexing: data?.allowIndexing || false, // デフォルトはfalse
    });
  } catch (error: any) {
    console.error('[API Site] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch site settings' }, { status: 500 });
  }
}

// サイト設定更新
export async function PUT(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    const { siteName, siteDescription, logoUrl, allowIndexing } = body;

    const updateData: any = {
      name: siteName,
      name_ja: siteName,
      siteDescription: siteDescription, // トップレベルに保存（実際のデータ構造に合わせる）
      'settings.logos.square': logoUrl,
      allowIndexing: allowIndexing || false,
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // 他言語へ翻訳
    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
    for (const lang of otherLangs) {
      try {
        updateData[`name_${lang}`] = await translateText(siteName, lang, 'サイト名');
        updateData[`siteDescription_${lang}`] = await translateText(siteDescription, lang, 'サイト説明文'); // トップレベルに保存
      } catch (error) {
        console.error(`[Site Translation Error] ${lang}:`, error);
        updateData[`name_${lang}`] = siteName;
        updateData[`siteDescription_${lang}`] = siteDescription; // トップレベルに保存
      }
    }

    await adminDb.collection('mediaTenants').doc(mediaId).update(updateData);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Site] エラー:', error);
    return NextResponse.json({ error: 'Failed to update site settings' }, { status: 500 });
  }
}

