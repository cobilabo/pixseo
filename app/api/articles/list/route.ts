import { NextRequest, NextResponse } from 'next/server';
import { getRecentArticlesServer, getPopularArticlesServer } from '@/lib/firebase/articles-server';
import { getMediaIdFromHost } from '@/lib/firebase/media-tenant-helper';
import { localizeArticle } from '@/lib/i18n/localize';
import { Lang, isValidLang } from '@/types/lang';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'recent'; // 'recent' or 'popular'
    const limitParam = searchParams.get('limit') || '4';
    const langParam = searchParams.get('lang') || 'ja';
    
    const limit = parseInt(limitParam, 10);
    const lang: Lang = isValidLang(langParam) ? langParam as Lang : 'ja';
    
    const mediaId = await getMediaIdFromHost();
    
    let articles;
    if (type === 'popular') {
      articles = await getPopularArticlesServer(limit, mediaId || undefined);
    } else {
      articles = await getRecentArticlesServer(limit, mediaId || undefined);
    }
    
    // 多言語化
    const localizedArticles = articles.map(article => localizeArticle(article, lang));
    
    // 必要なフィールドのみを返す
    const response = localizedArticles.map(article => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      featuredImage: article.featuredImage,
      featuredImageAlt: article.featuredImageAlt,
      publishedAt: article.publishedAt,
      viewCount: article.viewCount,
    }));
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Articles List API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
