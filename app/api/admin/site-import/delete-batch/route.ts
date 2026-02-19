import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function deleteCollection(
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  const snapshot = await adminDb.collection(collectionName)
    .where(field, '==', value)
    .get();

  if (snapshot.empty) return 0;

  const batch = adminDb.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

export async function POST(request: NextRequest) {
  try {
    const { batchId, mediaId } = await request.json();

    if (!batchId) {
      return NextResponse.json({ error: 'batchIdは必須です' }, { status: 400 });
    }

    const results: Record<string, number> = {};

    // Delete pages
    results.pages = await deleteCollection('pages', 'siteImportBatchId', batchId);

    // Delete custom blocks
    results.customBlocks = await deleteCollection('customBlocks', 'siteImportBatchId', batchId);

    // Delete media library entries and their Storage files
    const mediaSnapshot = await adminDb.collection('mediaLibrary')
      .where('siteImportBatchId', '==', batchId)
      .get();

    if (!mediaSnapshot.empty) {
      const bucket = adminStorage.bucket();

      for (const doc of mediaSnapshot.docs) {
        const data = doc.data();
        // Try to delete storage files by extracting path from URL
        if (data.url) {
          try {
            const urlPath = new URL(data.url).pathname;
            const match = urlPath.match(/media\/(images|thumbnails)\/[^?]+/);
            if (match) {
              await bucket.file(match[0]).delete().catch(() => {});
            }
          } catch { /* skip */ }
        }
        if (data.thumbnailUrl && data.thumbnailUrl !== data.url) {
          try {
            const urlPath = new URL(data.thumbnailUrl).pathname;
            const match = urlPath.match(/media\/thumbnails\/[^?]+/);
            if (match) {
              await bucket.file(match[0]).delete().catch(() => {});
            }
          } catch { /* skip */ }
        }
      }

      const batch = adminDb.batch();
      mediaSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      results.mediaLibrary = mediaSnapshot.size;
    } else {
      results.mediaLibrary = 0;
    }

    return NextResponse.json({
      success: true,
      deleted: results,
    });
  } catch (error: any) {
    console.error('[API site-import/delete-batch] Error:', error);
    return NextResponse.json(
      { error: error.message || '削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
