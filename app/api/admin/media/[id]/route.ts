import { NextResponse } from 'next/server';
import { adminStorage, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// メディア削除
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[API Media Delete] 削除開始:', params.id);
    
    // Firestoreからメタデータ取得
    const doc = await adminDb.collection('media').doc(params.id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const data = doc.data();
    const bucket = adminStorage.bucket();

    // URLからファイルパスを抽出して削除
    try {
      // メインファイル削除
      if (data?.url) {
        const mainPath = extractPathFromUrl(data.url);
        if (mainPath) {
          const mainFile = bucket.file(mainPath);
          await mainFile.delete().catch(() => {
            console.log('[API Media Delete] メインファイル削除スキップ（存在しない可能性）');
          });
        }
      }

      // サムネイル削除
      if (data?.thumbnailUrl && data.thumbnailUrl !== data.url) {
        const thumbnailPath = extractPathFromUrl(data.thumbnailUrl);
        if (thumbnailPath) {
          const thumbnailFile = bucket.file(thumbnailPath);
          await thumbnailFile.delete().catch(() => {
            console.log('[API Media Delete] サムネイル削除スキップ（存在しない可能性）');
          });
        }
      }
    } catch (storageError) {
      console.error('[API Media Delete] Storage削除エラー（続行）:', storageError);
    }

    // Firestoreから削除
    await adminDb.collection('media').doc(params.id).delete();
    
    console.log('[API Media Delete] 削除成功');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Media Delete] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete media' }, { status: 500 });
  }
}

// URLからStorageパスを抽出
function extractPathFromUrl(url: string): string | null {
  try {
    // Signed URLから実際のファイルパスを抽出
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // "/v0/b/{bucket}/o/{path}" 形式から {path} を抽出
    const match = pathname.match(/\/o\/(.+)$/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    
    return null;
  } catch (error) {
    console.error('[extractPathFromUrl] エラー:', error);
    return null;
  }
}

