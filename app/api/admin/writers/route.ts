import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';

/**
 * テキストが全て英語（アルファベット+スペース+記号）かどうかをチェック
 */
function isFullEnglish(text: string): boolean {
  if (!text || text.trim() === '') return false;
  // 英数字、スペース、一般的な記号のみで構成されているかチェック
  const englishOnlyPattern = /^[a-zA-Z0-9\s\.,!?;:'"()\-\/_&]+$/;
  return englishOnlyPattern.test(text);
}

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
    
    const writerData: any = {
      icon: icon || '',
      iconAlt: iconAlt || '',
      backgroundImage: backgroundImage || '',
      backgroundImageAlt: backgroundImageAlt || '',
      handleName,
      handleName_ja: handleName,
      bio: bio || '',
      bio_ja: bio || '',
      mediaId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // 他言語へ翻訳（全文英語の場合は翻訳せず、全言語で同じ値を使用）
    const isHandleNameEnglish = isFullEnglish(handleName);
    const isBioEnglish = isFullEnglish(bio || '');
    
    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
    for (const lang of otherLangs) {
      try {
        if (isHandleNameEnglish) {
          writerData[`handleName_${lang}`] = handleName;
        } else {
          writerData[`handleName_${lang}`] = await translateText(handleName, lang, 'ライター名');
        }
        
        if (bio) {
          if (isBioEnglish) {
            writerData[`bio_${lang}`] = bio;
          } else {
            writerData[`bio_${lang}`] = await translateText(bio, lang, 'ライター自己紹介文');
          }
        }
      } catch (error) {
        console.error(`[Writer Translation Error] ${lang}:`, error);
        writerData[`handleName_${lang}`] = handleName;
        writerData[`bio_${lang}`] = bio || '';
      }
    }
    
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

