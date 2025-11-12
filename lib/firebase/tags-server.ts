import { adminDb } from './admin';
import { Tag } from '@/types/article';

export const getTagsServer = async (): Promise<Tag[]> => {
  try {
    const tagsRef = adminDb.collection('tags');
    const snapshot = await tagsRef.orderBy('name', 'asc').get();
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as Tag;
    });
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
};

export const getTagServer = async (slug: string): Promise<Tag | null> => {
  try {
    const tagsRef = adminDb.collection('tags');
    const snapshot = await tagsRef
      .where('slug', '==', slug)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
    } as Tag;
  } catch (error) {
    console.error('Error getting tag:', error);
    return null;
  }
};



