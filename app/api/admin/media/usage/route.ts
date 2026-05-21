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

type UsageBuckets = {
  article: number;
  category: number;
  writer: number;
  theme: number;
  site: number;
  page: number;
};

const createBuckets = (): UsageBuckets => ({
  article: 0,
  category: 0,
  writer: 0,
  theme: 0,
  site: 0,
  page: 0,
});

// メディア使用状況を計算（POSTで対象メディアのリストを受け取る）
// パフォーマンス改善: メディア毎にクエリを発火するのではなく、
// 関連コレクションを1度だけ取得してメモリ上でURLマッチングする。
export async function POST(request: NextRequest) {
  try {
    const body: MediaUsageRequest = await request.json();
    const { mediaItems } = body;

    if (!mediaItems || !Array.isArray(mediaItems) || mediaItems.length === 0) {
      return NextResponse.json({ error: 'mediaItems is required' }, { status: 400 });
    }

    // URL -> 対象メディアIDの集合（複数メディアが同じURLを持つ可能性は低いが念のためSet）
    const urlToIds = new Map<string, Set<string>>();
    // mediaId（テナントID） -> 集合（後の絞り込みに使う）
    const tenantIds = new Set<string>();
    for (const item of mediaItems) {
      if (!item.url) continue;
      if (!urlToIds.has(item.url)) urlToIds.set(item.url, new Set());
      urlToIds.get(item.url)!.add(item.id);
      if (item.mediaId) tenantIds.add(item.mediaId);
    }

    // 各メディアIDごとの使用状況バケツを準備
    const buckets = new Map<string, UsageBuckets>();
    for (const item of mediaItems) {
      buckets.set(item.id, createBuckets());
    }

    const addUsage = (url: string | undefined | null, kind: keyof UsageBuckets, count = 1) => {
      if (!url) return;
      const ids = urlToIds.get(url);
      if (!ids) return;
      for (const id of ids) {
        const bucket = buckets.get(id);
        if (bucket) bucket[kind] += count;
      }
    };

    // 関連コレクションを並列で1回ずつ取得
    // テナントIDが1つに絞れる場合はそれで絞り込む（複数の場合はinクエリで最大10件）
    const tenantIdList = Array.from(tenantIds);
    const buildTenantQuery = (col: FirebaseFirestore.Query): FirebaseFirestore.Query => {
      if (tenantIdList.length === 1) {
        return col.where('mediaId', '==', tenantIdList[0]);
      }
      if (tenantIdList.length > 1 && tenantIdList.length <= 10) {
        return col.where('mediaId', 'in', tenantIdList);
      }
      return col;
    };

    const [
      articlesSnapshot,
      categoriesSnapshot,
      writersSnapshot,
      pagesSnapshot,
      tenantsSnapshot,
    ] = await Promise.all([
      buildTenantQuery(adminDb.collection('articles')).get(),
      buildTenantQuery(adminDb.collection('categories')).get(),
      buildTenantQuery(adminDb.collection('writers')).get(),
      buildTenantQuery(adminDb.collection('pages')).get(),
      adminDb.collection('mediaTenants').get(),
    ]);

    // 記事: アイキャッチ + 各言語コンテンツ中のURLマッチ
    // 大量URLを毎回 includes するとO(N*M)になるので、URL集合のキー一覧をループ単位で順に判定する
    const allUrls = Array.from(urlToIds.keys());
    for (const articleDoc of articlesSnapshot.docs) {
      const article = articleDoc.data();
      const featured: string | undefined = article.featuredImage;
      if (featured) addUsage(featured, 'article');

      // コンテンツを一旦結合して1回の文字列で判定（言語毎にループする必要を消す）
      const combinedContent: string =
        (typeof article.content === 'string' ? article.content : '') +
        (typeof article.content_ja === 'string' ? article.content_ja : '') +
        (typeof article.content_en === 'string' ? article.content_en : '') +
        (typeof article.content_zh === 'string' ? article.content_zh : '') +
        (typeof article.content_ko === 'string' ? article.content_ko : '');

      if (combinedContent.length === 0) continue;

      for (const url of allUrls) {
        if (url === featured) continue; // アイキャッチで既にカウント済みの分はスキップ
        if (combinedContent.includes(url)) {
          addUsage(url, 'article');
        }
      }
    }

    // カテゴリー: imageUrl
    for (const categoryDoc of categoriesSnapshot.docs) {
      const data = categoryDoc.data();
      addUsage(data.imageUrl, 'category');
    }

    // ライター: icon + backgroundImage
    for (const writerDoc of writersSnapshot.docs) {
      const data = writerDoc.data();
      addUsage(data.icon, 'writer');
      addUsage(data.backgroundImage, 'writer');
    }

    // 固定ページ: ブロックの imageUrl
    for (const pageDoc of pagesSnapshot.docs) {
      const page = pageDoc.data();
      if (!page.blocks || !Array.isArray(page.blocks)) continue;
      for (const block of page.blocks) {
        const config = block.config || {};
        if (
          (block.type === 'image' || block.type === 'imageText' || block.type === 'cta') &&
          config.imageUrl
        ) {
          addUsage(config.imageUrl, 'page');
        }
      }
    }

    // テナント設定: テーマ系 + サイト設定
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenant = tenantDoc.data();
      const theme = tenant.theme || {};

      addUsage(theme.firstView?.imageUrl, 'theme');

      if (Array.isArray(theme.footerBlocks)) {
        for (const block of theme.footerBlocks) {
          addUsage(block?.imageUrl, 'theme');
        }
      }
      if (Array.isArray(theme.footerContents)) {
        for (const content of theme.footerContents) {
          addUsage(content?.imageUrl, 'theme');
        }
      }

      addUsage(tenant.logoLandscape, 'site');
      addUsage(tenant.logoSquare, 'site');
      addUsage(tenant.logoPortrait, 'site');
      addUsage(tenant.ogImage, 'site');
    }

    // バケツを最終結果に整形
    const usageResults: UsageResult[] = mediaItems.map((item) => {
      const bucket = buckets.get(item.id) || createBuckets();
      const usageCount =
        bucket.article + bucket.category + bucket.writer + bucket.theme + bucket.site + bucket.page;
      const usageDetails: string[] = [];
      if (bucket.article > 0) usageDetails.push(`記事 (${bucket.article})`);
      if (bucket.category > 0) usageDetails.push(`カテゴリー (${bucket.category})`);
      if (bucket.writer > 0) usageDetails.push(`ライター (${bucket.writer})`);
      if (bucket.theme > 0) usageDetails.push(`テーマ (${bucket.theme})`);
      if (bucket.site > 0) usageDetails.push(`サイト (${bucket.site})`);
      if (bucket.page > 0) usageDetails.push(`固定ページ (${bucket.page})`);
      return {
        id: item.id,
        usageCount,
        usageDetails,
      };
    });

    return NextResponse.json(usageResults);
  } catch (error: any) {
    console.error('[API Media Usage] エラー:', error);
    return NextResponse.json({ error: 'Failed to calculate media usage' }, { status: 500 });
  }
}
