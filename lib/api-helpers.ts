import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * API共通のエラーレスポンスを返す
 */
export function errorResponse(message: string, details?: string, status: number = 500) {
  return NextResponse.json({ 
    error: message,
    details: details || 'Unknown error'
  }, { status });
}

/**
 * mediaIdヘッダーを取得
 */
export function getMediaIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-media-id');
}

/**
 * 汎用的な一覧取得ハンドラーを作成
 */
export function createListHandler<T>(
  collectionName: string,
  mapFunction: (doc: FirebaseFirestore.DocumentSnapshot) => T,
  options?: {
    orderByField?: string;
    orderByDirection?: 'asc' | 'desc';
  }
) {
  return async (request: NextRequest) => {
    try {
      const mediaId = getMediaIdFromRequest(request);
      
      console.log(`[API /admin/${collectionName}] Fetching ${collectionName}...`, { mediaId });
      
      const collectionRef = adminDb.collection(collectionName);
      let query: FirebaseFirestore.Query = collectionRef;
      
      if (mediaId) {
        query = query.where('mediaId', '==', mediaId);
      }
      
      if (options?.orderByField) {
        query = query.orderBy(options.orderByField, options.orderByDirection || 'asc');
      }
      
      const snapshot = await query.get();
      
      const items: T[] = snapshot.docs.map(mapFunction);
      
      console.log(`[API /admin/${collectionName}] Found ${items.length} ${collectionName}`);
      
      return NextResponse.json(items);
    } catch (error: any) {
      console.error(`[API /admin/${collectionName}] Error:`, error);
      return errorResponse(`Failed to fetch ${collectionName}`, error?.message);
    }
  };
}

/**
 * 汎用的なIDによる取得ハンドラーを作成
 */
export function createGetByIdHandler<T>(
  collectionName: string,
  mapFunction: (doc: FirebaseFirestore.DocumentSnapshot) => T
) {
  return async (
    request: NextRequest,
    { params }: { params: { id: string } }
  ) => {
    try {
      const docRef = adminDb.collection(collectionName).doc(params.id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      
      return NextResponse.json(mapFunction(doc));
    } catch (error: any) {
      console.error(`[API /admin/${collectionName}/${params.id}] Error:`, error);
      return errorResponse(`Failed to fetch ${collectionName}`, error?.message);
    }
  };
}

/**
 * 汎用的な削除ハンドラーを作成
 */
export function createDeleteHandler(collectionName: string) {
  return async (
    request: NextRequest,
    { params }: { params: { id: string } }
  ) => {
    try {
      await adminDb.collection(collectionName).doc(params.id).delete();
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error(`[API /admin/${collectionName}/${params.id}] Delete error:`, error);
      return errorResponse(`Failed to delete ${collectionName}`, error?.message);
    }
  };
}

/**
 * 汎用的な更新ハンドラーを作成
 */
export function createUpdateHandler(
  collectionName: string,
  beforeUpdate?: (data: any) => Promise<any>
) {
  return async (
    request: NextRequest,
    { params }: { params: { id: string } }
  ) => {
    try {
      let data = await request.json();
      
      if (beforeUpdate) {
        data = await beforeUpdate(data);
      }
      
      await adminDb.collection(collectionName).doc(params.id).update(data);
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error(`[API /admin/${collectionName}/${params.id}] Update error:`, error);
      return errorResponse(`Failed to update ${collectionName}`, error?.message);
    }
  };
}
