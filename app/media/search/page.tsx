import { Suspense } from 'react';
import SearchBar from '@/components/search/SearchBar';
import SearchContent from '@/components/search/SearchContent';
import MediaHeader from '@/components/layout/MediaHeader';
import CategoryBar from '@/components/layout/CategoryBar';
import FirstView from '@/components/layout/FirstView';
import FooterContentRenderer from '@/components/blocks/FooterContentRenderer';
import FooterTextLinksRenderer from '@/components/blocks/FooterTextLinksRenderer';
import { getMediaIdFromHost, getSiteInfo } from '@/lib/firebase/media-tenant-helper';
import { getTheme, getCombinedStyles } from '@/lib/firebase/theme-helper';
import { getCategoriesServer } from '@/lib/firebase/categories-server';

export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  // サーバーサイドでデータを取得
  const mediaId = await getMediaIdFromHost();
  
  // サイト設定、Theme、カテゴリーを並列取得
  const [siteInfo, theme, allCategories] = await Promise.all([
    getSiteInfo(mediaId || ''),
    getTheme(mediaId || ''),
    getCategoriesServer(),
  ]);

  // mediaIdでカテゴリーをフィルタリング
  const categories = mediaId 
    ? allCategories.filter(cat => cat.mediaId === mediaId)
    : allCategories;

  // スタイルとフッター情報を準備
  const combinedStyles = getCombinedStyles(theme);
  const footerContents = theme.footerContents?.filter(content => content.imageUrl) || [];
  const footerTextLinkSections = theme.footerTextLinkSections?.filter(section => section.title || section.links?.length > 0) || [];

  return (
    <>
      {/* 検索結果ページはnoindex（クエリパラメータ付きの場合） */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (window.location.search.includes('q=') || 
                window.location.search.includes('categoryId=') || 
                window.location.search.includes('tagId=')) {
              const meta = document.createElement('meta');
              meta.name = 'robots';
              meta.content = 'noindex, nofollow';
              document.head.appendChild(meta);
            }
          `,
        }}
      />
      <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
        {/* Themeスタイル注入 */}
        <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

        {/* ヘッダー */}
        <MediaHeader 
          siteName={siteInfo.name} 
          siteInfo={siteInfo}
          menuSettings={theme.menuSettings}
          menuBackgroundColor={theme.menuBackgroundColor}
          menuTextColor={theme.menuTextColor}
        />

        {/* FV（ファーストビュー） */}
        {theme.firstView && (
          <FirstView settings={theme.firstView} />
        )}

        {/* カテゴリーバー */}
        <CategoryBar categories={categories} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 検索バー */}
          <section className="mb-8">
            <SearchBar />
          </section>

          {/* 検索コンテンツ */}
          <Suspense fallback={<div className="text-center py-12">読み込み中...</div>}>
            <SearchContent />
          </Suspense>
        </main>

        {/* フッターコンテンツ */}
        {footerContents.length > 0 && (
          <section className="w-full">
            <FooterContentRenderer contents={footerContents} />
          </section>
        )}

        {/* フッター */}
        <footer className="bg-gray-900 text-white" style={{ backgroundColor: theme.footerBackgroundColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {footerTextLinkSections.length > 0 ? (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(footerTextLinkSections.length + 1, 3)} gap-8 mb-8`}>
                <div>
                  <h3 className="text-2xl font-bold mb-4">{siteInfo.name}</h3>
                  <p className="text-gray-300 whitespace-pre-line">{siteInfo.description}</p>
                </div>
                <FooterTextLinksRenderer sections={footerTextLinkSections} />
              </div>
            ) : (
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">{siteInfo.name}</h3>
                <p className="text-gray-300 whitespace-pre-line">{siteInfo.description}</p>
              </div>
            )}
            
            {footerTextLinkSections.length > 0 && (
              <div className="w-full border-t border-gray-700 pt-6">
                <p className="text-center text-sm text-gray-400">
                  © 2025 {siteInfo.name}. All rights reserved.
                </p>
              </div>
            )}
            {footerTextLinkSections.length === 0 && (
              <p className="text-center text-sm text-gray-400">
                © 2025 {siteInfo.name}. All rights reserved.
              </p>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
