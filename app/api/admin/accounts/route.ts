import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// アカウント一覧取得
export async function GET() {
  try {
    console.log('[API Accounts] アカウント一覧取得開始');
    
    const listUsersResult = await adminAuth.listUsers(1000); // 最大1000件
    
    const users = listUsersResult.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
    }));

    console.log('[API Accounts] 取得したアカウント数:', users.length);
    
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('[API Accounts] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// アカウント作成
export async function POST(request: Request) {
  try {
    console.log('[API Accounts] アカウント作成開始');
    
    const body = await request.json();
    const { email, password, displayName } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    console.log('[API Accounts] アカウント作成成功:', userRecord.uid);
    
    return NextResponse.json({ uid: userRecord.uid, email: userRecord.email });
  } catch (error: any) {
    console.error('[API Accounts] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 });
  }
}

