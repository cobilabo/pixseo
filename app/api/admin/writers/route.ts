import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET: ライター一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    let query = adminDb.collection('writers');
    
    // mediaIdでフィルタリング
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId) as any;
    }
    
    const snapshot = await query.get();
    
    const writers = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        iconUrl: data.iconUrl || '',
        handleName: data.handleName,
        bio: data.bio || '',
        mediaId: data.mediaId,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });
    
    return NextResponse.json(writers);
  } catch (error) {
    console.error('Error fetching writers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch writers' },
      { status: 500 }
    );
  }
}

// POST: ライター作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { iconUrl, handleName, bio, mediaId } = body;
    
    if (!handleName || !mediaId) {
      return NextResponse.json(
        { error: 'ハンドルネームとサービスは必須です' },
        { status: 400 }
      );
    }
    
    const writerData = {
      iconUrl: iconUrl || '',
      handleName,
      bio: bio || '',
      mediaId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    const docRef = await adminDb.collection('writers').add(writerData);
    
    return NextResponse.json({
      id: docRef.id,
      ...writerData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error: any) {
    console.error('Error creating writer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create writer' },
      { status: 500 }
    );
  }
}

