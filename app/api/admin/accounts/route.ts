import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// アカウント一覧取得
export async function GET() {
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
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('[API Accounts] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// アカウント作成
export async function POST(request: Request) {
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

