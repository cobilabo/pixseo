import { adminDb } from './admin';
import { Category } from '@/types/article';

export const getCategoriesServer = async (
  options: {
    isRecommended?: boolean;
  } = {}
): Promise<Category[]> => {
  try {
    const categoriesRef = adminDb.collection('categories');
    let q = categoriesRef;
    
    if (options.isRecommended) {
      q = q.where('isRecommended', '==', true) as any;
    }
    
    const snapshot = await q.orderBy('order', 'asc').get();
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as Category;
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const getCategoryServer = async (slug: string): Promise<Category | null> => {
  try {
    const categoriesRef = adminDb.collection('categories');
    const snapshot = await categoriesRef
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
    } as Category;
  } catch (error) {
    console.error('Error getting category:', error);
    return null;
  }
};



