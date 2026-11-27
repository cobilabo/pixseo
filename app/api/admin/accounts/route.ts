import { NextResponse, NextRequest } from 'next/server';
import { canAccessMedia, requireAdmin } from '@/lib/admin-auth';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// アカウント一覧取得
export async function GET(request: NextRequest) {
  const adminCtx = await requireAdmin(request);
  if (adminCtx instanceof NextResponse) return adminCtx;

  try {
    const listUsersResult = await adminAuth.listUsers(1000); // 最大1000件
    
    // FirestoreからlogoUrlを取得
    const usersPromises = listUsersResult.users.map(async (user) => {
      const userDoc = await adminDb.collection('users').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        logoUrl: userData?.logoUrl || '',
        role: userData?.role || 'admin',
        mediaIds: userData?.mediaIds || [],
        createdAt: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      };
    });

    const users = await Promise.all(usersPromises);
    if (adminCtx.isSuperAdmin) {
      return NextResponse.json(users);
    }
    // super_admin 以外には、自分と同じテナントに属するユーザーだけを返す
    const visible = users.filter(
      (u) =>
        u.uid === adminCtx.uid ||
        (u.role !== 'super_admin' &&
          Array.isArray(u.mediaIds) &&
          u.mediaIds.some((id: string) => canAccessMedia(adminCtx, id)))
    );
    return NextResponse.json(visible);
  } catch (error: any) {
    console.error('[API Accounts] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// アカウント作成
export async function POST(request: Request) {
  const adminCtx = await requireAdmin(request);
  if (adminCtx instanceof NextResponse) return adminCtx;

  try {
    const body = await request.json();
    const { email, password, displayName, logoUrl, mediaId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Firebase Authenticationにユーザーを作成
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });
    // Firestoreのusersコレクションに保存
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: displayName || '',
      logoUrl: logoUrl || '',
      role: 'admin',
      mediaIds: mediaId ? [mediaId] : [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    // mediaIdが指定されている場合、tenantsコレクションのmemberIdsに追加
    if (mediaId) {
      await adminDb.collection('mediaTenants').doc(mediaId).update({
        memberIds: FieldValue.arrayUnion(userRecord.uid),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return NextResponse.json({ uid: userRecord.uid, email: userRecord.email });
  } catch (error: any) {
    console.error('[API Accounts] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 });
  }
}

