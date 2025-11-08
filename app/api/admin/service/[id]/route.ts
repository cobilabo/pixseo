import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// メディアテナント取得
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Tenant Get] 取得開始:', params.id);
    
    const doc = await adminDb.collection('tenants').doc(params.id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    
    const data = doc.data();
    const tenant = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
    
    console.log('[API Tenant Get] 取得成功');
    
    return NextResponse.json(tenant);
  } catch (error: any) {
    console.error('[API Tenant Get] エラー:', error);
    return NextResponse.json({ error: 'Failed to get tenant' }, { status: 500 });
  }
}

// メディアテナント更新
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Tenant Update] 更新開始:', params.id);
    
    const body = await request.json();
    const { name, slug, customDomain, subdomain, settings, isActive } = body;

    // スラッグの重複チェック（自分以外）
    if (slug) {
      const existingSlug = await adminDb.collection('tenants')
        .where('slug', '==', slug)
        .get();
      
      const hasDuplicate = existingSlug.docs.some(doc => doc.id !== params.id);
      if (hasDuplicate) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
    }

    // カスタムドメインの重複チェック（自分以外）
    if (customDomain) {
      const existingDomain = await adminDb.collection('tenants')
        .where('customDomain', '==', customDomain)
        .get();
      
      const hasDuplicate = existingDomain.docs.some(doc => doc.id !== params.id);
      if (hasDuplicate) {
        return NextResponse.json({ error: 'Custom domain already exists' }, { status: 400 });
      }
    }

    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (customDomain !== undefined) updateData.customDomain = customDomain || null;
    if (subdomain !== undefined) updateData.subdomain = subdomain;
    if (settings !== undefined) updateData.settings = settings;
    if (isActive !== undefined) updateData.isActive = isActive;

    await adminDb.collection('tenants').doc(params.id).update(updateData);
    
    console.log('[API Tenant Update] 更新成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Tenant Update] エラー:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

// メディアテナント削除
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Tenant Delete] 削除開始:', params.id);
    
    // TODO: 関連する記事・バナー・メディアファイルも削除するか確認
    // 今回は論理削除（isActive: false）を推奨
    
    await adminDb.collection('tenants').doc(params.id).delete();
    
    console.log('[API Tenant Delete] 削除成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Tenant Delete] エラー:', error);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}

