import { adminDb } from './admin';
import { ContentBlock } from '@/types/block';

/**
 * 指定されたmediaIdとplacementのブロックを取得（サーバーサイド）
 * @param mediaId - メディアID
 * @param placement - 配置場所（例: 'footer', 'sidebar-top'）
 * @param layoutTheme - レイアウトテーマ（オプション）
 * @returns ブロックの配列
 */
export async function getBlocksServer(
  mediaId: string,
  placement: string,
  layoutTheme?: string
): Promise<ContentBlock[]> {
  try {
    let query = adminDb
      .collection('blocks')
      .where('mediaId', '==', mediaId)
      .where('placement', '==', placement)
      .where('isActive', '==', true);

    // layoutThemeが指定されている場合は追加フィルタ
    if (layoutTheme) {
      query = query.where('layoutTheme', '==', layoutTheme) as any;
    }

    const snapshot = await query.orderBy('order', 'asc').get();

    const blocks: ContentBlock[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type || 'banner',
        title: data.title || '',
        placement: data.placement || '',
        layoutTheme: data.layoutTheme,
        categoryIds: data.categoryIds,
        content: data.content || {
          imageUrl: data.imageUrl || '',
          linkUrl: data.linkUrl || '',
        },
        order: data.order || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        mediaId: data.mediaId || '',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });

    return blocks;
  } catch (error) {
    console.error('[getBlocksServer] Error:', error);
    return [];
  }
}

/**
 * 指定されたmediaIdの全ブロックを配置場所ごとに取得
 * @param mediaId - メディアID
 * @param layoutTheme - レイアウトテーマ（オプション）
 * @returns 配置場所をキーとしたブロックのマップ
 */
export async function getAllBlocksByPlacementServer(
  mediaId: string,
  layoutTheme?: string
): Promise<Record<string, ContentBlock[]>> {
  try {
    let query = adminDb
      .collection('blocks')
      .where('mediaId', '==', mediaId)
      .where('isActive', '==', true);

    // layoutThemeが指定されている場合は追加フィルタ
    if (layoutTheme) {
      query = query.where('layoutTheme', '==', layoutTheme) as any;
    }

    const snapshot = await query.orderBy('order', 'asc').get();

    const blocksByPlacement: Record<string, ContentBlock[]> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const placement = data.placement || 'default';

      const block: ContentBlock = {
        id: doc.id,
        type: data.type || 'banner',
        title: data.title || '',
        placement: data.placement || '',
        layoutTheme: data.layoutTheme,
        categoryIds: data.categoryIds,
        content: data.content || {
          imageUrl: data.imageUrl || '',
          linkUrl: data.linkUrl || '',
        },
        order: data.order || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        mediaId: data.mediaId || '',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };

      if (!blocksByPlacement[placement]) {
        blocksByPlacement[placement] = [];
      }
      blocksByPlacement[placement].push(block);
    });

    return blocksByPlacement;
  } catch (error) {
    console.error('[getAllBlocksByPlacementServer] Error:', error);
    return {};
  }
}

