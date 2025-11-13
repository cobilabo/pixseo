import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { adminDb } from '@/lib/firebase/admin';
import MediaHeader from '@/components/layout/MediaHeader';
import ArticleCard from '@/components/articles/ArticleCard';
import SearchBar from '@/components/search/SearchBar';

// ISR: 60秒ごとに再生成
export const revalidate = 60;

export const metadata: Metadata = {
  title: '記事一覧 | ふらっと。',
  description: 'バリアフリー情報記事一覧',
};

export default async function ArticlesPage() {
  const headersList = headers();
  const mediaIdFromHeader = headersList.get('x-media-id');
  const host = headersList.get('host') || '';
  
  // ホスト名からスラッグを抽出してmediaIdを取得
  let mediaId = mediaIdFromHeader;
  
  if (!mediaId && host.endsWith('.pixseo.cloud') && host !== 'admin.pixseo.cloud') {
    const slug = host.replace('.pixseo.cloud', '');
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
      console.error('[Articles Page] Error fetching mediaId:', error);
    }
  }
  
  // サイト名を取得
  let siteName = 'メディアサイト';
  if (mediaId) {
    try {
      const tenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
      if (tenantDoc.exists) {
        siteName = tenantDoc.data()?.name || 'メディアサイト';
      }
    } catch (error) {
      console.error('[Articles Page] Error fetching site name:', error);
    }
  }
  
  // 記事とカテゴリーを並列取得
  const [articles, allCategories] = await Promise.all([
    getArticlesServer({ limit: 30 }),
    getCategoriesServer(),
  ]);
  
  // mediaIdでカテゴリーをフィルタリング
  const categories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー＆カテゴリーバー */}
      <MediaHeader siteName={siteName} categories={categories} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索バー */}
        <section className="mb-8">
          <SearchBar />
        </section>

        {/* 記事一覧 */}
        <section>
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-gray-900 mb-1">記事一覧</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider">All Articles</p>
          </div>
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">記事がまだありません</p>
            </div>
          )}
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">© 2024 Ayumi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

