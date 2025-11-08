import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// アカウント削除
export async function DELETE(request: Request, { params }: { params: { uid: string } }) {
  try {
    console.log('[API Account Delete] 削除開始:', params.uid);
    
    await adminAuth.deleteUser(params.uid);
    
    console.log('[API Account Delete] 削除成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Account Delete] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete account' }, { status: 500 });
  }
}

// アカウント更新
export async function PUT(request: Request, { params }: { params: { uid: string } }) {
  try {
    console.log('[API Account Update] 更新開始:', params.uid);
    
    const body = await request.json();
    const { email, password, displayName } = body;

    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (displayName !== undefined) updateData.displayName = displayName;

    await adminAuth.updateUser(params.uid, updateData);
    
    console.log('[API Account Update] 更新成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Account Update] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to update account' }, { status: 500 });
  }
}

// アカウント取得
export async function GET(request: Request, { params }: { params: { uid: string } }) {
  try {
    console.log('[API Account Get] 取得開始:', params.uid);
    
    const userRecord = await adminAuth.getUser(params.uid);
    
    const user = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    };
    
    console.log('[API Account Get] 取得成功');
    
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('[API Account Get] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to get account' }, { status: 500 });
  }
}

