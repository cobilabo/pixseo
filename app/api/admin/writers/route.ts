import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET: ライター一覧取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    console.log('[API /admin/writers] Fetching writers...', { mediaId });
    
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
        icon: data.icon || data.iconUrl || '', // 互換性のため両方チェック
        iconAlt: data.iconAlt || '',
        backgroundImage: data.backgroundImage || '',
        backgroundImageAlt: data.backgroundImageAlt || '',
        handleName: data.handleName,
        bio: data.bio || '',
        mediaId: data.mediaId,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });
    
    console.log(`[API /admin/writers] Found ${writers.length} writers`);
    
    return NextResponse.json(writers);
  } catch (error: any) {
    console.error('[API /admin/writers] Error:', error);
    console.error('[API /admin/writers] Error message:', error?.message);
    console.error('[API /admin/writers] Error code:', error?.code);
    return NextResponse.json(
      { 
        error: 'Failed to fetch writers',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: ライター作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { icon, iconAlt, backgroundImage, backgroundImageAlt, handleName, bio, mediaId } = body;
    
    if (!handleName || !mediaId) {
      return NextResponse.json(
        { error: 'ハンドルネームとサービスは必須です' },
        { status: 400 }
      );
    }
    
    const writerData = {
      icon: icon || '',
      iconAlt: iconAlt || '',
      backgroundImage: backgroundImage || '',
      backgroundImageAlt: backgroundImageAlt || '',
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

