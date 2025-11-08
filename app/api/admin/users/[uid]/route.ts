import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;
    
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      // ユーザードキュメントが存在しない場合、デフォルトで admin ロールを返す
      return NextResponse.json({
        uid,
        role: 'admin',
      });
    }
    
    const userData = userDoc.data();
    
    return NextResponse.json({
      uid,
      email: userData?.email,
      role: userData?.role || 'admin',
      displayName: userData?.displayName,
      mediaIds: userData?.mediaIds || [],
      createdAt: userData?.createdAt?.toDate?.() || new Date(),
      updatedAt: userData?.updatedAt?.toDate?.() || new Date(),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

