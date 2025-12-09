import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

// メディアテナント取得
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Tenant Get] 取得開始:', params.id);
    
    const doc = await adminDb.collection('mediaTenants').doc(params.id).get();
    
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
    console.log('[API Service Update] 更新開始:', params.id);
    
    const body = await request.json();
    const { 
      name, 
      slug, 
      customDomain, 
      clientId, 
      settings, 
      isActive,
      siteDescription,
      logoLandscape,
      logoSquare,
      logoPortrait,
      allowIndexing,
      theme,
      previewAuth,
    } = body;

    // 現在のサービスデータを取得
    const currentDoc = await adminDb.collection('mediaTenants').doc(params.id).get();
    if (!currentDoc.exists) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    const currentData = currentDoc.data()!;
    const oldClientId = currentData.clientId;

    // スラッグの重複チェック（自分以外）
    if (slug) {
      const existingSlug = await adminDb.collection('mediaTenants')
        .where('slug', '==', slug)
        .get();
      
      const hasDuplicate = existingSlug.docs.some(doc => doc.id !== params.id);
      if (hasDuplicate) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
    }

    // カスタムドメインの重複チェック（自分以外）
    if (customDomain) {
      const existingDomain = await adminDb.collection('mediaTenants')
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

    if (name !== undefined) {
      updateData.name = name;
      updateData.name_ja = name;
    }
    if (slug !== undefined) updateData.slug = slug;
    if (customDomain !== undefined) updateData.customDomain = customDomain || null;
    if (settings !== undefined) updateData.settings = settings;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (clientId !== undefined) updateData.clientId = clientId || null;
    if (siteDescription !== undefined) updateData.siteDescription = siteDescription;
    if (logoLandscape !== undefined) updateData.logoLandscape = logoLandscape;
    if (logoSquare !== undefined) updateData.logoSquare = logoSquare;
    if (logoPortrait !== undefined) updateData.logoPortrait = logoPortrait;
    if (allowIndexing !== undefined) updateData.allowIndexing = allowIndexing;
    if (theme !== undefined) updateData.theme = theme;
    if (previewAuth !== undefined) updateData.previewAuth = previewAuth;

    // 多言語翻訳処理
    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
    for (const lang of otherLangs) {
      try {
        // サイト名の翻訳
        if (name !== undefined) {
          console.log(`[Service Translation] ${lang} サイト名翻訳開始...`);
          updateData[`name_${lang}`] = await translateText(name, lang, 'サイト名');
          console.log(`[Service Translation] ${lang} サイト名翻訳成功`);
        }
        
        // サイト説明文の翻訳
        if (siteDescription !== undefined) {
          console.log(`[Service Translation] ${lang} サイト説明文翻訳開始...`);
          updateData[`siteDescription_${lang}`] = await translateText(siteDescription, lang, 'サイト説明文');
          console.log(`[Service Translation] ${lang} サイト説明文翻訳成功`);
        }
      } catch (error) {
        console.error(`[Service Translation Error] ${lang}:`, error);
        // エラー時は日本語をそのまま使用
        if (name !== undefined) updateData[`name_${lang}`] = name;
        if (siteDescription !== undefined) updateData[`siteDescription_${lang}`] = siteDescription;
      }
    }

    // クライアントが変更された場合の処理
    if (clientId !== undefined && clientId !== oldClientId) {
      // 古いクライアントのmediaIdsから削除
      if (oldClientId) {
        const oldClientDoc = await adminDb.collection('clients').doc(oldClientId).get();
        if (oldClientDoc.exists) {
          const oldClientData = oldClientDoc.data();
          const oldClientUid = oldClientData?.uid;
          if (oldClientUid) {
            await adminDb.collection('users').doc(oldClientUid).update({
              mediaIds: FieldValue.arrayRemove(params.id),
              updatedAt: FieldValue.serverTimestamp(),
            });
            // memberIdsからも削除
            updateData.memberIds = FieldValue.arrayRemove(oldClientUid);
          }
        }
      }

      // 新しいクライアントのmediaIdsに追加
      if (clientId) {
        const newClientDoc = await adminDb.collection('clients').doc(clientId).get();
        if (newClientDoc.exists) {
          const newClientData = newClientDoc.data();
          const newClientUid = newClientData?.uid;
          if (newClientUid) {
            await adminDb.collection('users').doc(newClientUid).update({
              mediaIds: FieldValue.arrayUnion(params.id),
              updatedAt: FieldValue.serverTimestamp(),
            });
            // memberIdsにも追加
            await adminDb.collection('mediaTenants').doc(params.id).update({
              memberIds: FieldValue.arrayUnion(newClientUid),
            });
          }
        }
      }
    }

    await adminDb.collection('mediaTenants').doc(params.id).update(updateData);
    
    console.log('[API Service Update] 更新成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Service Update] エラー:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

// メディアテナント削除
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Tenant Delete] 削除開始:', params.id);
    
    // TODO: 関連する記事・バナー・メディアファイルも削除するか確認
    // 今回は論理削除（isActive: false）を推奨
    
    await adminDb.collection('mediaTenants').doc(params.id).delete();
    
    console.log('[API Tenant Delete] 削除成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Tenant Delete] エラー:', error);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}

