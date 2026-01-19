import { adminDb } from './admin';
import { CustomBlock } from '@/types/custom-block';

// カスタムブロックを取得（Server-side用）
export const getCustomBlockByIdServer = async (id: string): Promise<CustomBlock | null> => {
  try {
    const customBlockRef = adminDb.collection('customBlocks').doc(id);
    const customBlockSnap = await customBlockRef.get();
    
    if (!customBlockSnap.exists) {
      return null;
    }
    
    const data = customBlockSnap.data();
    if (!data) return null;
    
    return {
      id: customBlockSnap.id,
      mediaId: data.mediaId,
      name: data.name,
      html: data.html,
      css: data.css,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('[getCustomBlockByIdServer] Error:', error);
    return null;
  }
};
