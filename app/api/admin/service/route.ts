import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// メディアテナント一覧取得
export async function GET() {
  try {
    console.log('[API Tenants] メディアテナント一覧取得開始');
    
    const snapshot = await adminDb.collection('tenants').orderBy('createdAt', 'desc').get();
    
    const tenants = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    console.log('[API Tenants] 取得したメディア数:', tenants.length);
    
    return NextResponse.json(tenants);
  } catch (error: any) {
    console.error('[API Tenants] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

// メディアテナント作成
export async function POST(request: Request) {
  try {
    console.log('[API Tenants] メディアテナント作成開始');
    
    const body = await request.json();
    const { name, slug, customDomain, subdomain, ownerId, settings } = body;

    if (!name || !slug || !ownerId) {
      return NextResponse.json({ error: 'Name, slug, and ownerId are required' }, { status: 400 });
    }

    // スラッグの重複チェック
    const existingSlug = await adminDb.collection('tenants').where('slug', '==', slug).get();
    if (!existingSlug.empty) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    // カスタムドメインの重複チェック
    if (customDomain) {
      const existingDomain = await adminDb.collection('tenants').where('customDomain', '==', customDomain).get();
      if (!existingDomain.empty) {
        return NextResponse.json({ error: 'Custom domain already exists' }, { status: 400 });
      }
    }

    const tenantData = {
      name,
      slug,
      customDomain: customDomain || null,
      subdomain: subdomain || slug,
      ownerId,
      memberIds: [ownerId], // 初期メンバーはオーナーのみ
      settings: settings || {
        siteName: name,
        siteDescription: '',
        logoUrl: '',
      },
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('tenants').add(tenantData);
    
    console.log('[API Tenants] メディアテナント作成成功:', docRef.id);
    
    return NextResponse.json({ id: docRef.id });
  } catch (error: any) {
    console.error('[API Tenants] エラー:', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}

