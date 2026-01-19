import { collection, addDoc, getDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from './client';
import { CustomBlock } from '@/types/custom-block';

// カスタムブロックを作成
export const createCustomBlock = async (data: Omit<CustomBlock, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
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
  const customBlockRef = doc(db, 'customBlocks', id);
  await updateDoc(customBlockRef, {
    ...data,
    updatedAt: new Date(),
  });
};

// カスタムブロックを削除
export const deleteCustomBlock = async (id: string): Promise<void> => {
  const customBlockRef = doc(db, 'customBlocks', id);
  await deleteDoc(customBlockRef);
};
