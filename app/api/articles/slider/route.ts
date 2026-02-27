import { NextRequest, NextResponse } from 'next/server';
import { getSliderArticlesServer } from '@/lib/firebase/articles-server';
import { getCategoriesServer } from '@/lib/firebase/categories-server';
import { getMediaIdFromHost } from '@/lib/firebase/media-tenant-helper';
import { localizeArticle } from '@/lib/i18n/localize';
import { Lang, isValidLang } from '@/types/lang';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const langParam = searchParams.get('lang') || 'ja';
    const lang: Lang = isValidLang(langParam) ? langParam as Lang : 'ja';

    const mediaId = await getMediaIdFromHost();
    const [articles, allCategories] = await Promise.all([
      getSliderArticlesServer(mediaId || undefined),
      getCategoriesServer({ mediaId: mediaId || undefined }),
    ]);

    const localizedArticles = articles.map(article => {
      const localized = localizeArticle(article, lang);
      const categoryNames = (article.categoryIds || [])
        .map((catId: string) => {
          const cat = allCategories.find(c => c.id === catId);
          return cat ? ((cat as any)[`name_${lang}`] || cat.name) : null;
        })
        .filter(Boolean) as string[];
      return { ...localized, categoryNames };
    });

    return NextResponse.json({ articles: localizedArticles });
  } catch (error: any) {
    console.error('[API] slider articles error:', error);
    return NextResponse.json({ articles: [] }, { status: 500 });
  }
}
