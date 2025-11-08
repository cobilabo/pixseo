import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

// GET: クライアント一覧取得
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection('clients')
      .orderBy('createdAt', 'desc')
      .get();

    const clients = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        logoUrl: data.logoUrl || '',
        email: data.email,
        clientName: data.clientName,
        contactPerson: data.contactPerson || '',
        address: data.address || '',
        uid: data.uid,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST: 新規クライアント作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logoUrl, email, password, clientName, contactPerson, address } = body;

    if (!email || !password || !clientName) {
      return NextResponse.json(
        { error: 'メールアドレス、パスワード、クライアント名は必須です' },
        { status: 400 }
      );
    }

    // Firebase Authenticationにユーザーを作成
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: clientName,
    });

    // Firestoreにクライアント情報を保存
    const clientData = {
      logoUrl: logoUrl || '',
      email,
      clientName,
      contactPerson: contactPerson || '',
      address: address || '',
      uid: userRecord.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('clients').add(clientData);

    // usersコレクションにも保存（role: admin）
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      role: 'admin',
      displayName: clientName,
      mediaIds: [], // サービス紐付け時に更新される
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      id: docRef.id,
      ...clientData,
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create client' },
      { status: 500 }
    );
  }
}

