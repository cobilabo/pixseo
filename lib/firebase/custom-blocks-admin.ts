import { collection, addDoc, getDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db, initializeFirebase } from './config';
import { CustomBlock } from '@/types/custom-block';
import { CustomBlockRevision } from '@/types/revision';
import { createRevision, pruneRevisions, listRevisions, getRevisionById } from './revisions-admin';

export { listRevisions as listCustomBlockRevisions, getRevisionById as getCustomBlockRevisionById } from './revisions-admin';

// クライアント側でFirebaseを初期化
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// カスタムブロックを作成
export const createCustomBlock = async (data: Omit<CustomBlock, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  const customBlocksRef = collection(db, 'customBlocks');
  const newCustomBlock = {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const docRef = await addDoc(customBlocksRef, newCustomBlock);
  return docRef.id;
};

// カスタムブロックを取得（ID指定）
export const getCustomBlockById = async (id: string): Promise<CustomBlock | null> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  const customBlockRef = doc(db, 'customBlocks', id);
  const customBlockSnap = await getDoc(customBlockRef);
  
  if (!customBlockSnap.exists()) {
    return null;
  }
  
  const data = customBlockSnap.data();
  return {
    id: customBlockSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as CustomBlock;
};

// カスタムブロック一覧を取得（mediaId指定）
export const getCustomBlocksByMediaId = async (mediaId: string): Promise<CustomBlock[]> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  const customBlocksRef = collection(db, 'customBlocks');
  const q = query(
    customBlocksRef,
    where('mediaId', '==', mediaId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as CustomBlock));
};

// カスタムブロックを更新
export const updateCustomBlock = async (id: string, data: Partial<Omit<CustomBlock, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  const customBlockRef = doc(db, 'customBlocks', id);
  await updateDoc(customBlockRef, {
    ...data,
    updatedAt: new Date(),
  });
};

function customBlockToSnapshot(block: CustomBlock): Omit<CustomBlock, 'id'> {
  const { id: _id, ...snapshot } = block;
  return snapshot;
}

/**
 * 更新前の状態をリビジョンとして保存してから更新
 */
export const updateCustomBlockWithRevision = async (
  id: string,
  data: Partial<Omit<CustomBlock, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const current = await getCustomBlockById(id);
  if (!current) {
    throw new Error('Custom block not found');
  }

  await createRevision('customBlock', id, customBlockToSnapshot(current));
  await updateCustomBlock(id, data);
  await pruneRevisions('customBlock', id);
};

/**
 * リビジョンからカスタムブロックを復元
 */
export const restoreCustomBlockRevision = async (blockId: string, revisionId: string): Promise<void> => {
  const revision = await getRevisionById<CustomBlockRevision>('customBlock', blockId, revisionId);
  if (!revision) {
    throw new Error('Revision not found');
  }

  const current = await getCustomBlockById(blockId);
  if (!current) {
    throw new Error('Custom block not found');
  }

  await createRevision('customBlock', blockId, customBlockToSnapshot(current));
  await updateCustomBlock(blockId, revision.snapshot);
  await pruneRevisions('customBlock', blockId);
};

// カスタムブロックを削除
export const deleteCustomBlock = async (id: string): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  const customBlockRef = doc(db, 'customBlocks', id);
  await deleteDoc(customBlockRef);
};
