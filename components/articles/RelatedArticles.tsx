import { RelatedArticle } from '@/types/article';
import { Lang } from '@/types/lang';
import ArticleCard from './ArticleCard';

interface RelatedArticlesProps {
  articles: RelatedArticle[];
  lang?: Lang;
}

export default function RelatedArticles({ articles, lang = 'ja' }: RelatedArticlesProps) {
  // 配列チェック
  if (!Array.isArray(articles) || articles.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">関連記事</h2>
        <p className="text-xs text-gray-500 uppercase tracking-wider">Related Articles</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => {
          // 各記事の安全チェック
          if (!article || !article.id) {
            return null;
          }
          
          return (
            <ArticleCard
              key={article.id}
              article={{
                id: article.id,
                title: article.title || '',
                excerpt: article.excerpt,
                featuredImage: article.featuredImage,
                slug: article.slug || '',
                publishedAt: article.publishedAt,
                updatedAt: article.publishedAt,
                content: '',
                writerId: '',  // ライターID（必須）
                categoryIds: [],
                tagIds: [],
                relatedArticleIds: [],
                tableOfContents: [],
                isPublished: true,
                viewCount: 0,
                likeCount: 0,
                mediaId: article.mediaId || '',
                isFeatured: false,
                metaTitle: '',
                metaDescription: '',
                googleMapsUrl: '',
                reservationUrl: '',
              }}
              lang={lang}
            />
          );
        })}
      </div>
    </section>
  );
}

