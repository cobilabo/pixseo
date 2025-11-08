import { RelatedArticle } from '@/types/article';
import ArticleCard from './ArticleCard';

interface RelatedArticlesProps {
  articles: RelatedArticle[];
}

export default function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">関連記事</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={{
              id: article.id,
              title: article.title,
              excerpt: article.excerpt,
              featuredImage: article.featuredImage,
              slug: article.slug,
              publishedAt: article.publishedAt,
              updatedAt: article.publishedAt,
              content: '',
              authorId: '',
              authorName: '',
              categoryIds: [],
              tagIds: [],
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
          />
        ))}
      </div>
    </section>
  );
}

