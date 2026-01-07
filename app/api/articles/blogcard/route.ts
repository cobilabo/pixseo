import { NextRequest, NextResponse } from 'next/server';
import { getArticleServer, getWriterServer } from '@/lib/firebase/articles-server';
import { getMediaIdFromHost } from '@/lib/firebase/media-tenant-helper';
import { localizeArticle, localizeWriter } from '@/lib/i18n/localize';
import { Lang, isValidLang } from '@/types/lang';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const langParam = searchParams.get('lang') || 'ja';
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const lang: Lang = isValidLang(langParam) ? langParam as Lang : 'ja';

    // ホストからメディアIDを取得
    const mediaId = await getMediaIdFromHost();
    
    // 記事データを取得
    const rawArticle = await getArticleServer(slug, mediaId || undefined);
    
    if (!rawArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // 記事を多言語化
    const article = localizeArticle(rawArticle, lang);

    // ライター情報を取得
    let writerName = '';
    if (article.writerId) {
      const rawWriter = await getWriterServer(article.writerId);
      if (rawWriter) {
        const writer = localizeWriter(rawWriter, lang);
        writerName = writer.handleName || '';
      }
    }

    // ブログカード用のデータを返す
    return NextResponse.json({
      title: article.title || '',
      featuredImage: article.featuredImage || null,
      metaDescription: article.metaDescription || article.excerpt || '',
      writerName,
      slug: article.slug,
      lang,
    });
  } catch (error) {
    console.error('[BlogCard API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

