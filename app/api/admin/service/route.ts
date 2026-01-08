import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// メディアテナント一覧取得
export async function GET() {
  try {
    const snapshot = await adminDb.collection('mediaTenants').orderBy('createdAt', 'desc').get();
    
    const tenants = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });
    return NextResponse.json(tenants);
  } catch (error: any) {
    console.error('[API Tenants] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

// サービス作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      slug, 
      customDomain, 
      ownerId, 
      clientId, 
      settings,
      siteDescription,
      logoLandscape,
      logoSquare,
      logoPortrait,
      isActive,
      allowIndexing
    } = body;

    if (!name || !slug || !ownerId) {
      return NextResponse.json({ error: 'Name, slug, and ownerId are required' }, { status: 400 });
    }

    // スラッグの重複チェック
    const existingSlug = await adminDb.collection('mediaTenants').where('slug', '==', slug).get();
    if (!existingSlug.empty) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    // カスタムドメインの重複チェック
    if (customDomain) {
      const existingDomain = await adminDb.collection('mediaTenants').where('customDomain', '==', customDomain).get();
      if (!existingDomain.empty) {
        return NextResponse.json({ error: 'Custom domain already exists' }, { status: 400 });
      }
    }

    // クライアントIDがある場合、クライアントのmediaIdsを更新
    let memberIds = [ownerId];
    if (clientId) {
      const clientDoc = await adminDb.collection('clients').doc(clientId).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        const clientUid = clientData?.uid;
        if (clientUid && !memberIds.includes(clientUid)) {
          memberIds.push(clientUid);
        }
      }
    }

    const tenantData = {
      name,
      slug,
      customDomain: customDomain || null,
      ownerId,
      memberIds,
      clientId: clientId || null,
      siteDescription: siteDescription || '',
      logoLandscape: logoLandscape || '',
      logoSquare: logoSquare || '',
      logoPortrait: logoPortrait || '',
      isActive: isActive !== undefined ? isActive : false, // デフォルトOFF
      allowIndexing: allowIndexing !== undefined ? allowIndexing : false, // デフォルトOFF（NOINDEX）
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('mediaTenants').add(tenantData);
    
    // クライアントのmediaIdsを更新
    if (clientId) {
      const clientDoc = await adminDb.collection('clients').doc(clientId).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        const clientUid = clientData?.uid;
        if (clientUid) {
          await adminDb.collection('users').doc(clientUid).update({
            mediaIds: FieldValue.arrayUnion(docRef.id),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }
    return NextResponse.json({ id: docRef.id });
  } catch (error: any) {
    console.error('[API Service] エラー:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}

