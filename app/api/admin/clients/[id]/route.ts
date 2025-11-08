import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

// GET: 単一クライアント取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const doc = await adminDb.collection('clients').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      logoUrl: data.logoUrl || '',
      email: data.email,
      clientName: data.clientName,
      contactPerson: data.contactPerson || '',
      address: data.address || '',
      uid: data.uid,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT: クライアント更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { logoUrl, email, clientName, contactPerson, address, password } = body;

    const doc = await adminDb.collection('clients').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const currentData = doc.data()!;
    const uid = currentData.uid;

    // Firebase Authenticationのユーザー情報を更新
    const updateData: any = {
      displayName: clientName,
    };

    // メールアドレスが変更された場合
    if (email && email !== currentData.email) {
      updateData.email = email;
    }

    // パスワードが指定された場合
    if (password) {
      updateData.password = password;
    }

    await adminAuth.updateUser(uid, updateData);

    // Firestoreのクライアント情報を更新
    const clientData = {
      logoUrl: logoUrl || '',
      email: email || currentData.email,
      clientName,
      contactPerson: contactPerson || '',
      address: address || '',
      updatedAt: new Date(),
    };

    await adminDb.collection('clients').doc(id).update(clientData);

    // usersコレクションも更新
    await adminDb.collection('users').doc(uid).update({
      email: clientData.email,
      displayName: clientName,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      id,
      ...clientData,
      uid,
      createdAt: currentData.createdAt?.toDate?.() || new Date(),
    });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE: クライアント削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const doc = await adminDb.collection('clients').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const data = doc.data()!;
    const uid = data.uid;

    // Firebase Authenticationからユーザーを削除
    await adminAuth.deleteUser(uid);

    // usersコレクションから削除
    await adminDb.collection('users').doc(uid).delete();

    // clientsコレクションから削除
    await adminDb.collection('clients').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}

