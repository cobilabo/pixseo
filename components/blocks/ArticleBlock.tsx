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
import { t } from '@/lib/i18n/translations';

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
  const [categoryName, setCategoryName] = useState<string | undefined>();
  
  // 新着/人気記事一覧を取得
  useEffect(() => {
    if (config.articleType === 'recent' || config.articleType === 'popular') {
      const fetchArticles = async () => {
        setLoading(true);
        setCategoryName(undefined);
        try {
          const params = new URLSearchParams({
            type: config.articleType,
            limit: String(config.displayCount || 4),
            lang,
          });
          if (config.categoryId) {
            params.set('category', config.categoryId);
          }
          const response = await fetch(`/api/articles/list?${params}`);
          if (response.ok) {
            const data = await response.json();
            setArticles(data.articles || []);
            if (data.categoryName) {
              setCategoryName(data.categoryName);
            }
          }
        } catch (error) {
          console.error('Error fetching articles:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchArticles();
    }
  }, [config.articleType, config.displayCount, config.categoryId, lang]);

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
    const defaultTitle = config.articleType === 'recent' ? t('section.recentArticles', lang) : t('section.popularArticles', lang);
    const defaultTitleEn = config.articleType === 'recent' ? t('section.recentArticlesEn', lang) : t('section.popularArticlesEn', lang);
    const localizedTitle = lang !== 'ja' ? (config as any)[`title_${lang}`] : undefined;
    const displayTitle = categoryName || localizedTitle || config.title || defaultTitle;
    const displayTitleEn = categoryName ? undefined : (config.titleEn !== undefined ? config.titleEn : defaultTitleEn);

    const containerStyle: React.CSSProperties = {
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '0 20px',
    };

    if (loading) {
      return (
        <section className="article-block-list" style={containerStyle}>
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{displayTitle}</h2>
            {displayTitleEn && <p className="text-xs text-gray-500 uppercase tracking-wider">{displayTitleEn}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: config.displayCount || 4 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (articles.length === 0) {
      return (
        <section className="article-block-list" style={containerStyle}>
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{displayTitle}</h2>
            {displayTitleEn && <p className="text-xs text-gray-500 uppercase tracking-wider">{displayTitleEn}</p>}
          </div>
          <p className="text-gray-500 text-center py-8">
            {t('message.noArticles', lang)}
          </p>
        </section>
      );
    }

    return (
      <section className="article-block-list" style={containerStyle}>
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{displayTitle}</h2>
          {displayTitleEn && <p className="text-xs text-gray-500 uppercase tracking-wider">{displayTitleEn}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <ArticleCard 
              key={article.id} 
              article={article as Article} 
              lang={lang} 
            />
          ))}
        </div>
      </section>
    );
  }

  return null;
}
