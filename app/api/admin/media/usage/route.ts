import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

interface MediaUsageRequest {
  mediaItems: {
    id: string;
    url: string;
    mediaId: string;
  }[];
}

interface UsageResult {
  id: string;
  usageCount: number;
  usageDetails: string[];
}

// メディア使用状況を計算（POSTで対象メディアのリストを受け取る）
export async function POST(request: NextRequest) {
  try {
    const body: MediaUsageRequest = await request.json();
    const { mediaItems } = body;

    if (!mediaItems || !Array.isArray(mediaItems) || mediaItems.length === 0) {
      return NextResponse.json({ error: 'mediaItems is required' }, { status: 400 });
    }    // 共通データを一度だけ取得（テナント情報）
    const tenantsSnapshot = await adminDb.collection('mediaTenants').get();

    // 各メディアの使用状況を並列で計算
    const usageResults: UsageResult[] = await Promise.all(
      mediaItems.map(async (item) => {
        const mediaUrl = item.url;
        const mediaId = item.mediaId;
        
        let usageCount = 0;
        const usageDetails: string[] = [];

        // 記事での使用をチェック（アイキャッチ + 記事内画像）
        const articlesSnapshot = await adminDb.collection('articles')
          .where('mediaId', '==', mediaId)
          .get();
        
        let articleUsageCount = 0;
        for (const articleDoc of articlesSnapshot.docs) {
          const article = articleDoc.data();
          
          // アイキャッチ画像
          if (article.featuredImage === mediaUrl) {
            articleUsageCount++;
          }
          
          // 記事内の画像（全言語のコンテンツをチェック）
          const contentFields = [
            article.content,
            article.content_ja,
            article.content_en,
            article.content_zh,
            article.content_ko,
          ];
          
          for (const content of contentFields) {
            if (content && typeof content === 'string' && content.includes(mediaUrl)) {
              articleUsageCount++;
              break;
            }
          }
        }
        
        if (articleUsageCount > 0) {
          usageCount += articleUsageCount;
          usageDetails.push(`記事 (${articleUsageCount})`);
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
        const [writersIconSnapshot, writersBackgroundSnapshot] = await Promise.all([
          adminDb.collection('writers').where('icon', '==', mediaUrl).get(),
          adminDb.collection('writers').where('backgroundImage', '==', mediaUrl).get(),
        ]);
        const writerUsage = writersIconSnapshot.size + writersBackgroundSnapshot.size;
        if (writerUsage > 0) {
          usageCount += writerUsage;
          usageDetails.push(`ライター (${writerUsage})`);
        }
        
        // テーマ（FV画像、フッターブロック、フッターコンテンツ）での使用をチェック
        let themeUsage = 0;
        for (const tenantDoc of tenantsSnapshot.docs) {
          const tenant = tenantDoc.data();
          const theme = tenant.theme || {};
          
          if (theme.firstView?.imageUrl === mediaUrl) {
            themeUsage++;
          }
          
          if (theme.footerBlocks) {
            const blockUsage = theme.footerBlocks.filter((block: any) => block.imageUrl === mediaUrl).length;
            themeUsage += blockUsage;
          }
          
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
          .where('mediaId', '==', mediaId)
          .get();
        let pageBlockUsage = 0;
        for (const pageDoc of pagesSnapshot.docs) {
          const page = pageDoc.data();
          if (page.blocks && Array.isArray(page.blocks)) {
            for (const block of page.blocks) {
              const config = block.config || {};
              if (block.type === 'image' && config.imageUrl === mediaUrl) {
                pageBlockUsage++;
              }
              if (block.type === 'imageText' && config.imageUrl === mediaUrl) {
                pageBlockUsage++;
              }
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
          id: item.id,
          usageCount,
          usageDetails,
        };
      })
    );    return NextResponse.json(usageResults);
  } catch (error: any) {
    console.error('[API Media Usage] エラー:', error);
    return NextResponse.json({ error: 'Failed to calculate media usage' }, { status: 500 });
  }
}

