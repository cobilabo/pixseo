import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';
import {
  getOrRepairMainWriterId,
  setMainWriterId,
  reassignArticlesWriter,
} from '@/lib/admin/writers-main-writer';
import { invalidateWriterServerCache } from '@/lib/cache-manager';

/**
 * テキストが全て英語（アルファベット+スペース+記号）かどうかをチェック
 */
function isFullEnglish(text: string): boolean {
  if (!text || text.trim() === '') return false;
  // 英数字、スペース、一般的な記号のみで構成されているかチェック
  const englishOnlyPattern = /^[a-zA-Z0-9\s\.,!?;:'"()\-\/_&]+$/;
  return englishOnlyPattern.test(text);
}

// GET: 単一ライター取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const doc = await adminDb.collection('writers').doc(id).get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Writer not found' },
        { status: 404 }
      );
    }
    
    const data = doc.data()!;
    const mediaId = data.mediaId as string;
    const writersSnap = await adminDb.collection('writers').where('mediaId', '==', mediaId).get();
    const mainWriterId = await getOrRepairMainWriterId(mediaId);

    return NextResponse.json({
      id: doc.id,
      icon: data.icon || data.iconUrl || '', // 互換性のため両方チェック
      iconAlt: data.iconAlt || '',
      backgroundImage: data.backgroundImage || '',
      backgroundImageAlt: data.backgroundImageAlt || '',
      handleName: data.handleName,
      bio: data.bio || '',
      mediaId,
      isMainWriter: doc.id === mainWriterId,
      writerCountForMedia: writersSnap.size,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    });
  } catch (error) {
    console.error('Error fetching writer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch writer' },
      { status: 500 }
    );
  }
}

// PUT: ライター更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { icon, iconAlt, backgroundImage, backgroundImageAlt, handleName, bio, isMainWriter } = body;

    const mediaIdHeader = request.headers.get('x-media-id');
    const doc = await adminDb.collection('writers').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Writer not found' },
        { status: 404 }
      );
    }

    const existingMediaId = doc.data()!.mediaId as string;
    if (mediaIdHeader && mediaIdHeader !== existingMediaId) {
      return NextResponse.json({ error: 'このライターは編集できません' }, { status: 403 });
    }

    if (typeof isMainWriter === 'boolean' && isMainWriter === false) {
      const writersSnap = await adminDb.collection('writers').where('mediaId', '==', existingMediaId).get();
      const count = writersSnap.size;
      const mainId = await getOrRepairMainWriterId(existingMediaId);
      if (mainId === id) {
        if (count <= 1) {
          return NextResponse.json(
            { error: '唯一のライターはメインライターのままにしてください' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          {
            error: 'メインを外す前に、別のライターをメインに設定してください',
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      icon: icon || '',
      iconAlt: iconAlt || '',
      backgroundImage: backgroundImage || '',
      backgroundImageAlt: backgroundImageAlt || '',
      handleName,
      handleName_ja: handleName,
      bio: bio || '',
      bio_ja: bio || '',
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // 他言語へ翻訳（全文英語の場合は翻訳せず、全言語で同じ値を使用）
    const isHandleNameEnglish = isFullEnglish(handleName);
    const isBioEnglish = isFullEnglish(bio || '');
    
    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
    for (const lang of otherLangs) {
      try {
        if (isHandleNameEnglish) {
          updateData[`handleName_${lang}`] = handleName;
        } else {
          updateData[`handleName_${lang}`] = await translateText(handleName, lang, 'ライター名');
        }
        
        if (bio) {
          if (isBioEnglish) {
            updateData[`bio_${lang}`] = bio;
          } else {
            updateData[`bio_${lang}`] = await translateText(bio, lang, 'ライター自己紹介文');
          }
        }
      } catch (error) {
        console.error(`[Writer Translation Error] ${lang}:`, error);
        updateData[`handleName_${lang}`] = handleName;
        updateData[`bio_${lang}`] = bio || '';
      }
    }
    
    await adminDb.collection('writers').doc(id).update(updateData);
    invalidateWriterServerCache(id);

    const mediaId = existingMediaId;

    if (isMainWriter === true) {
      await setMainWriterId(mediaId, id);
    }

    const finalMain = await getOrRepairMainWriterId(mediaId);

    return NextResponse.json({
      id,
      isMainWriter: id === finalMain,
    });
  } catch (error: any) {
    console.error('Error updating writer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update writer' },
      { status: 500 }
    );
  }
}

// DELETE: ライター削除（メイン不可・非メイン削除時は記事をメインへ付け替え）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const mediaIdHeader = request.headers.get('x-media-id');
    const doc = await adminDb.collection('writers').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Writer not found' },
        { status: 404 }
      );
    }

    const data = doc.data()!;
    const mediaId = data.mediaId as string;
    if (mediaIdHeader && mediaIdHeader !== mediaId) {
      return NextResponse.json({ error: 'このライターは削除できません' }, { status: 403 });
    }

    const mainWriterId = await getOrRepairMainWriterId(mediaId);
    if (mainWriterId === id) {
      return NextResponse.json(
        { error: 'メインライターは削除できません' },
        { status: 400 }
      );
    }

    if (!mainWriterId) {
      return NextResponse.json(
        { error: 'メインライターを設定できませんでした' },
        { status: 500 }
      );
    }

    await reassignArticlesWriter(id, mainWriterId);
    await adminDb.collection('writers').doc(id).delete();
    invalidateWriterServerCache(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting writer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete writer' },
      { status: 500 }
    );
  }
}

