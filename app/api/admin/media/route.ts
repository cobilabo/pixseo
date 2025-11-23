import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// メディア一覧取得
export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーからmediaIdを取得
    const mediaId = request.headers.get('x-media-id');
    
    console.log('[API Media] メディア一覧取得開始', { mediaId });
    
    let query: FirebaseFirestore.Query = adminDb.collection('media');
    
    // mediaIdが指定されている場合はフィルタリング
    if (mediaId) {
      query = query.where('mediaId', '==', mediaId);
    }
    
    // orderByはクライアント側で行う（複合インデックスを避けるため）
    const snapshot = await query.get();
    
    // 各メディアの使用数を計算
    const mediaWithUsage = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const mediaUrl = data.url;
        
        // 使用数をカウント
        let usageCount = 0;
        const usageDetails: string[] = [];
        
        // 記事での使用をチェック
        const articlesSnapshot = await adminDb.collection('articles')
          .where('featuredImage', '==', mediaUrl)
          .get();
        if (articlesSnapshot.size > 0) {
          usageCount += articlesSnapshot.size;
          usageDetails.push(`記事 (${articlesSnapshot.size})`);
        }
        
        // カテゴリーでの使用をチェック
        const categoriesSnapshot = await adminDb.collection('categories')
          .where('imageUrl', '==', mediaUrl)
          .get();
        if (categoriesSnapshot.size > 0) {
          usageCount += categoriesSnapshot.size;
          usageDetails.push(`カテゴリー (${categoriesSnapshot.size})`);
        }
        
        // ライターでの使用をチェック（アイコンと背景画像）
        const writersIconSnapshot = await adminDb.collection('writers')
          .where('icon', '==', mediaUrl)
          .get();
        const writersBackgroundSnapshot = await adminDb.collection('writers')
          .where('backgroundImage', '==', mediaUrl)
          .get();
        const writerUsage = writersIconSnapshot.size + writersBackgroundSnapshot.size;
        if (writerUsage > 0) {
          usageCount += writerUsage;
          usageDetails.push(`ライター (${writerUsage})`);
        }
        
        // テーマ（FV画像、フッターブロック、フッターコンテンツ）での使用をチェック
        const tenantsSnapshot = await adminDb.collection('mediaTenants').get();
        let themeUsage = 0;
        for (const tenantDoc of tenantsSnapshot.docs) {
          const tenant = tenantDoc.data();
          const theme = tenant.theme || {};
          
          // FV画像
          if (theme.firstView?.imageUrl === mediaUrl) {
            themeUsage++;
          }
          
          // フッターブロック
          if (theme.footerBlocks) {
            const blockUsage = theme.footerBlocks.filter((block: any) => block.imageUrl === mediaUrl).length;
            themeUsage += blockUsage;
          }
          
          // フッターコンテンツ
          if (theme.footerContents) {
            const contentUsage = theme.footerContents.filter((content: any) => content.imageUrl === mediaUrl).length;
            themeUsage += contentUsage;
          }
        }
        if (themeUsage > 0) {
          usageCount += themeUsage;
          usageDetails.push(`テーマ (${themeUsage})`);
        }
        
        // サイト設定での使用をチェック
        let siteUsage = 0;
        for (const tenantDoc of tenantsSnapshot.docs) {
          const tenant = tenantDoc.data();
          // ロゴ3種類 + OGイメージをチェック
          if (
            tenant.logoLandscape === mediaUrl ||
            tenant.logoSquare === mediaUrl ||
            tenant.logoPortrait === mediaUrl ||
            tenant.ogImage === mediaUrl
          ) {
            siteUsage++;
          }
        }
        if (siteUsage > 0) {
          usageCount += siteUsage;
          usageDetails.push(`サイト (${siteUsage})`);
        }
        
        // 固定ページのブロックでの使用をチェック
        const pagesSnapshot = await adminDb.collection('pages')
          .where('mediaId', '==', data.mediaId)
          .get();
        let pageBlockUsage = 0;
        for (const pageDoc of pagesSnapshot.docs) {
          const page = pageDoc.data();
          if (page.blocks && Array.isArray(page.blocks)) {
            for (const block of page.blocks) {
              const config = block.config || {};
              // 画像ブロック
              if (block.type === 'image' && config.imageUrl === mediaUrl) {
                pageBlockUsage++;
              }
              // 画像&テキストブロック
              if (block.type === 'imageText' && config.imageUrl === mediaUrl) {
                pageBlockUsage++;
              }
              // CTAブロック
              if (block.type === 'cta' && config.imageUrl === mediaUrl) {
                pageBlockUsage++;
              }
            }
          }
        }
        if (pageBlockUsage > 0) {
          usageCount += pageBlockUsage;
          usageDetails.push(`固定ページ (${pageBlockUsage})`);
        }
        
        return {
          id: doc.id,
          ...data,
          usageCount,
          usageDetails,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      })
    );

    // クライアント側でソートする代わりに、ここでソート
    mediaWithUsage.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('[API Media] 取得したメディア数:', mediaWithUsage.length);
    
    return NextResponse.json(mediaWithUsage);
  } catch (error: any) {
    console.error('[API Media] エラー:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

