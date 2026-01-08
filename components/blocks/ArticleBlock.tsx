'use client';

/**
 * 記事ブロックのフロントエンド表示
 */

import { useEffect, useState } from 'react';
import { Block, ArticleBlockConfig } from '@/types/block';
import BlogCard from '@/components/articles/BlogCard';
import ArticleCard from '@/components/articles/ArticleCard';
import Link from 'next/link';
import { Article } from '@/types/article';
import { Lang } from '@/types/lang';

interface ArticleBlockProps {
  block: Block;
  lang?: Lang;
}

interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  publishedAt?: Date;
  viewCount?: number;
}

export default function ArticleBlock({ block, lang = 'ja' as Lang }: ArticleBlockProps) {
  const config = block.config as ArticleBlockConfig;
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 新着/人気記事一覧を取得
  useEffect(() => {
    if (config.articleType === 'recent' || config.articleType === 'popular') {
      const fetchArticles = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/articles/list?type=${config.articleType}&limit=${config.displayCount || 4}&lang=${lang}`
          );
          if (response.ok) {
            const data = await response.json();
            setArticles(data);
          }
        } catch (error) {
          console.error('Error fetching articles:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchArticles();
    }
  }, [config.articleType, config.displayCount, lang]);

  // 個別記事選択の場合
  if (config.articleType === 'single') {
    if (!config.articleSlug) {
      return null;
    }

    const articleUrl = `/${lang}/articles/${config.articleSlug}`;

    // テキストリンク形式
    if (config.displayStyle === 'text') {
      return (
        <div className="article-block-text">
          <Link 
            href={articleUrl}
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            {config.articleTitle || config.articleSlug}
          </Link>
        </div>
      );
    }

    // ブログカード形式
    return (
      <div className="article-block-blogcard">
        <BlogCard href={articleUrl} lang={lang} />
      </div>
    );
  }

  // 新着/人気記事一覧の場合
  if (config.articleType === 'recent' || config.articleType === 'popular') {
    if (loading) {
      return (
        <div className="article-block-list">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: config.displayCount || 4 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (articles.length === 0) {
      return (
        <div className="article-block-list text-center py-8 text-gray-500">
          {config.articleType === 'recent' ? '新着記事がありません' : '人気記事がありません'}
        </div>
      );
    }

    return (
      <div className="article-block-list">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <ArticleCard 
              key={article.id} 
              article={article as Article} 
              lang={lang} 
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
