import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, initializeFirebase } from './config';
import { getCurrentUser } from './auth';
import { REVISION_KEEP_COUNT, RevisionMeta } from '@/types/revision';

if (typeof window !== 'undefined') {
  initializeFirebase();
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return new Date();
}

function formatRevisionLabel(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRevisionCollectionPath(entityType: 'page' | 'customBlock', entityId: string): string {
  if (entityType === 'page') return `pages/${entityId}/revisions`;
  return `customBlocks/${entityId}/revisions`;
}

async function createRevision<TSnapshot>(
  entityType: 'page' | 'customBlock',
  entityId: string,
  snapshot: TSnapshot
): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized');

  const user = getCurrentUser();
  const now = new Date();
  const revisionsRef = collection(db, getRevisionCollectionPath(entityType, entityId));

  const docRef = await addDoc(revisionsRef, {
    snapshot,
    createdAt: Timestamp.fromDate(now),
    createdByUid: user?.uid ?? null,
    createdByEmail: user?.email ?? null,
    label: formatRevisionLabel(now),
  });

  return docRef.id;
}

export async function pruneRevisions(
  entityType: 'page' | 'customBlock',
  entityId: string,
  keep: number = REVISION_KEEP_COUNT
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  const revisionsRef = collection(db, getRevisionCollectionPath(entityType, entityId));
  const q = query(revisionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  const toDelete = snapshot.docs.slice(keep);
  await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
}

export async function listRevisions<T extends RevisionMeta>(
  entityType: 'page' | 'customBlock',
  entityId: string
): Promise<T[]> {
  if (!db) throw new Error('Firestore is not initialized');

  const revisionsRef = collection(db, getRevisionCollectionPath(entityType, entityId));
  const q = query(revisionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: toDate(data.createdAt),
    } as T;
  });
}

export async function getRevisionById<T extends RevisionMeta>(
  entityType: 'page' | 'customBlock',
  entityId: string,
  revisionId: string
): Promise<T | null> {
  if (!db) throw new Error('Firestore is not initialized');

  const revisionRef = doc(db, getRevisionCollectionPath(entityType, entityId), revisionId);
  const revisionSnap = await getDoc(revisionRef);

  if (!revisionSnap.exists()) return null;

  const data = revisionSnap.data();
  return {
    id: revisionSnap.id,
    ...data,
    createdAt: toDate(data.createdAt),
  } as T;
}

export { createRevision, formatRevisionLabel };
