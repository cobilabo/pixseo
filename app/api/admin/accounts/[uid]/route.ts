import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// アカウント削除
export async function DELETE(request: Request, { params }: { params: { uid: string } }) {
  try {
    await adminAuth.deleteUser(params.uid);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Account Delete] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete account' }, { status: 500 });
  }
}

// アカウント更新
export async function PUT(request: Request, { params }: { params: { uid: string } }) {
  try {
    const body = await request.json();
    const { email, password, displayName, logoUrl } = body;

    // Firebase Authenticationを更新
    const authUpdateData: any = {};
    if (email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;
    if (displayName !== undefined) authUpdateData.displayName = displayName;

    await adminAuth.updateUser(params.uid, authUpdateData);
    // Firestoreのusersコレクションを更新
    const firestoreUpdateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (email) firestoreUpdateData.email = email;
    if (displayName !== undefined) firestoreUpdateData.displayName = displayName;
    if (logoUrl !== undefined) firestoreUpdateData.logoUrl = logoUrl;

    await adminDb.collection('users').doc(params.uid).set(firestoreUpdateData, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Account Update] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to update account' }, { status: 500 });
  }
}

// アカウント取得
export async function GET(request: Request, { params }: { params: { uid: string } }) {
  try {
    const userRecord = await adminAuth.getUser(params.uid);
    
    // Firestoreからlogoを取得
    const userDoc = await adminDb.collection('users').doc(params.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    const user = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      logoUrl: userData?.logoUrl || '',
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    };
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('[API Account Get] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to get account' }, { status: 500 });
  }
}

