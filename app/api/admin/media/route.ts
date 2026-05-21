import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// メディア一覧取得（ページネーション対応）
// クエリパラメータ:
//   - limit: 1ページあたりの件数（デフォルト50、最大200）
//   - cursor: 前ページ最後の createdAt の ISO 文字列（カーソル）
// レスポンス:
//   { items: MediaFile[], nextCursor: string | null }
// 注意: where('mediaId', '==', x).orderBy('createdAt', 'desc') の組み合わせを
//       使うため、media / mediaLibrary それぞれに mediaId+createdAt の複合
//       インデックスが必要（firestore.indexes.json で定義済み）。
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit'));
    const cursor = searchParams.get('cursor');
    const limit = Math.min(
      Math.max(Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    const buildQuery = (col: FirebaseFirestore.Query): FirebaseFirestore.Query => {
      let q: FirebaseFirestore.Query = col;
      if (mediaId) q = q.where('mediaId', '==', mediaId);
      q = q.orderBy('createdAt', 'desc').limit(limit + 1);
      if (cursor) {
        const cursorDate = new Date(cursor);
        if (!Number.isNaN(cursorDate.getTime())) {
          q = q.startAfter(Timestamp.fromDate(cursorDate));
        }
      }
      return q;
    };

    const [snapshot1, snapshot2] = await Promise.all([
      buildQuery(adminDb.collection('media')).get(),
      buildQuery(adminDb.collection('mediaLibrary')).get(),
    ]);

    const allDocs = [...snapshot1.docs, ...snapshot2.docs];

    const mediaList = allDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date(0).toISOString(),
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() ||
          data.createdAt?.toDate?.()?.toISOString() ||
          new Date(0).toISOString(),
      };
    });

    mediaList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const items = mediaList.slice(0, limit);
    const hasMore = mediaList.length > limit;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt ?? null : null;

    return NextResponse.json({ items, nextCursor });
  } catch (error: any) {
    console.error('[API Media] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
