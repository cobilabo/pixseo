import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const mediaRef = (mediaId: string) => adminDb.collection('mediaTenants').doc(mediaId);

/**
 * メディアの mainWriterId を返す。未設定・不正な場合は最も古いライターをメインに補正する。
 */
export async function getOrRepairMainWriterId(mediaId: string): Promise<string | null> {
  const writersSnap = await adminDb.collection('writers').where('mediaId', '==', mediaId).get();
  if (writersSnap.empty) {
    const m = await mediaRef(mediaId).get();
    if (m.exists && m.data()?.mainWriterId) {
      await mediaRef(mediaId).update({
        mainWriterId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return null;
  }

  const writers = writersSnap.docs.map((d) => ({
    id: d.id,
    createdAt: d.data().createdAt,
  }));

  const mDoc = await mediaRef(mediaId).get();
  let mainId = mDoc.data()?.mainWriterId as string | undefined;
  const valid = mainId && writers.some((w) => w.id === mainId);

  if (!valid) {
    const ts = (v: unknown) => {
      if (!v || typeof v !== 'object') return 0;
      const t = v as { toMillis?: () => number; seconds?: number };
      if (typeof t.toMillis === 'function') return t.toMillis();
      if (typeof t.seconds === 'number') return t.seconds * 1000;
      return 0;
    };
    writers.sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
    mainId = writers[0].id;
    await mediaRef(mediaId).update({
      mainWriterId: mainId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return mainId ?? null;
}

export async function setMainWriterId(mediaId: string, writerId: string): Promise<void> {
  await mediaRef(mediaId).update({
    mainWriterId: writerId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** 指定ライターに紐づく全記事の writerId を付け替え（同一メディア想定） */
export async function reassignArticlesWriter(fromWriterId: string, toWriterId: string): Promise<number> {
  const snap = await adminDb.collection('articles').where('writerId', '==', fromWriterId).get();
  const docs = snap.docs;
  const CHUNK = 400;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = adminDb.batch();
    const slice = docs.slice(i, i + CHUNK);
    slice.forEach((doc) => {
      batch.update(doc.ref, {
        writerId: toWriterId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }
  return docs.length;
}
