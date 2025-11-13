import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getCategoryServer, getCategoriesServer } from '@/lib/firebase/categories-server';
import { getArticlesServer } from '@/lib/firebase/articles-server';
import { adminDb } from '@/lib/firebase/admin';
import MediaHeader from '@/components/layout/MediaHeader';
import ArticleCard from '@/components/articles/ArticleCard';
import SearchBar from '@/components/search/SearchBar';

// ISR: 60秒ごとに再生成
export const revalidate = 60;

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = await getCategoryServer(params.slug);
  
  if (!category) {
    return {
      title: 'カテゴリーが見つかりません | ふらっと。',
    };
  }

  return {
    title: `${category.name}の記事一覧 | ふらっと。`,
    description: category.description || `${category.name}に関するバリアフリー情報記事一覧`,
    openGraph: {
      title: `${category.name}の記事一覧 | ふらっと。`,
      description: category.description || `${category.name}に関するバリアフリー情報記事一覧`,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const category = await getCategoryServer(params.slug);

  if (!category) {
    notFound();
  }

  const headersList = headers();
  const mediaIdFromHeader = headersList.get('x-media-id');
  const host = headersList.get('host') || '';
  
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
      console.error('[Category Page] Error fetching mediaId:', error);
    }
  }
  
  let siteName = 'メディアサイト';
  if (mediaId) {
    try {
      const tenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
      if (tenantDoc.exists) {
        siteName = tenantDoc.data()?.name || 'メディアサイト';
      }
    } catch (error) {
      console.error('[Category Page] Error fetching site name:', error);
    }
  }

  const [articles, allCategories] = await Promise.all([
    getArticlesServer({ categoryId: category.id, limit: 30 }),
    getCategoriesServer(),
  ]);
  
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

        {/* カテゴリーヘッダー */}
        <section className="mb-8">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {category.name}の記事
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Category</p>
          </div>
          {category.description && (
            <p className="text-gray-600 text-center">{category.description}</p>
          )}
        </section>

        {/* 記事一覧 */}
        <section>
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">このカテゴリーにはまだ記事がありません</p>
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


