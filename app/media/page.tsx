import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getRecentArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { adminDb } from '@/lib/firebase/admin';
import MediaHeader from '@/components/layout/MediaHeader';
import SearchBar from '@/components/search/SearchBar';
import ArticleCard from '@/components/articles/ArticleCard';
import ExternalLinks from '@/components/common/ExternalLinks';
import RecommendedCategories from '@/components/common/RecommendedCategories';

// 動的レンダリング + Firestoreキャッシュで高速化
// headers()を使用しているため、完全な静的生成はできない
// が、メモリキャッシュ（5分）により 30〜50ms の高速応答を実現
export const dynamic = 'force-dynamic';

// 動的にメタデータを生成
export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const mediaId = headersList.get('x-media-id');
  
  let allowIndexing = false;
  let siteName = 'ふらっと。';
  let siteDescription = 'おでかけ・外出に役立つバリアフリー情報を探す';
  
  // mediaIdがある場合、テナント情報を取得
  if (mediaId) {
    try {
      const tenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
      if (tenantDoc.exists) {
        const data = tenantDoc.data();
        allowIndexing = data?.allowIndexing || false;
        siteName = data?.name || siteName;
        siteDescription = data?.settings?.siteDescription || siteDescription;
      }
    } catch (error) {
      console.error('[Media Page] Error fetching tenant info:', error);
    }
  }
  
  return {
    title: `${siteName} | バリアフリー情報メディア`,
    description: siteDescription,
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    openGraph: {
      title: `${siteName} | バリアフリー情報メディア`,
      description: siteDescription,
    },
  };
}

export default async function MediaPage() {
  // mediaIdを取得（複数の方法を試す）
  const headersList = headers();
  const mediaIdFromHeader = headersList.get('x-media-id');
  const host = headersList.get('host') || '';
  
  // ホスト名からスラッグを抽出してmediaIdを取得
  let mediaId = mediaIdFromHeader;
  
  if (!mediaId && host.endsWith('.pixseo.cloud') && host !== 'admin.pixseo.cloud') {
    const slug = host.replace('.pixseo.cloud', '');
    
    // Firestoreからスラッグに対応するmediaIdを取得
    try {
      const tenantsSnapshot = await adminDb
        .collection('mediaTenants')
        .where('slug', '==', slug)
        .limit(1)
        .get();
      
      if (!tenantsSnapshot.empty) {
        mediaId = tenantsSnapshot.docs[0].id;
      }
    } catch (error) {
      console.error('[Media Page] Error fetching mediaId:', error);
    }
  }
  
  // サイト設定を取得
  let siteSettings = {
    name: 'メディアサイト',
    description: 'メディアサイトの説明',
    mainTitle: '',
    mainSubtitle: '',
  };
  
  if (mediaId) {
    try {
      const tenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
      if (tenantDoc.exists) {
        const data = tenantDoc.data();
        siteSettings = {
          name: data?.name || 'メディアサイト',
          description: data?.siteDescription || 'メディアサイトの説明',
          mainTitle: data?.mainTitle || data?.siteDescription || 'メディアサイト',
          mainSubtitle: data?.mainSubtitle || '',
        };
      }
    } catch (error) {
      console.error('[Media Page] Error fetching site settings:', error);
    }
  }
  
  // 記事データとカテゴリーを並列取得（サーバーサイド）
  const [recentArticles, popularArticles, allCategories] = await Promise.all([
    getRecentArticlesServer(10, mediaId || undefined),
    getPopularArticlesServer(10, mediaId || undefined),
    getCategoriesServer(),
  ]);
  
  // mediaIdでカテゴリーをフィルタリング
  const categories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // JSON-LD 構造化データ（WebSite）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteSettings.name,
    description: siteSettings.description,
    url: `https://${host}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `https://${host}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ヘッダー＆カテゴリーバー */}
      <MediaHeader siteName={siteSettings.name} categories={categories} />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ファーストビュー: 検索バー */}
        <section className="mb-12">
          <SearchBar />
        </section>

        {/* おすすめカテゴリー */}
        <section className="mb-12">
          <RecommendedCategories />
        </section>

        {/* 新着記事 */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">新着記事</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Recent Articles</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.length > 0 ? (
              recentArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))
            ) : (
              <p className="text-gray-500 col-span-full text-center py-8">
                記事がまだありません
              </p>
            )}
          </div>
        </section>

        {/* 人気記事ランキング */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">人気記事ランキング</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Popular Articles</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularArticles.length > 0 ? (
              popularArticles.map((article, index) => (
                <div key={article.id} className="relative">
                  <span className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                    {index + 1}
                  </span>
                  <ArticleCard article={article} />
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-full text-center py-8">
                記事がまだありません
              </p>
            )}
          </div>
        </section>

        {/* 外部リンク */}
        <section className="mb-12">
          <ExternalLinks />
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">{siteSettings.name}</h3>
            {siteSettings.description && (
              <p className="text-gray-300 max-w-2xl mx-auto">
                {siteSettings.description}
              </p>
            )}
            <p className="text-gray-400 text-sm pt-4">
              © {new Date().getFullYear()} {siteSettings.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

