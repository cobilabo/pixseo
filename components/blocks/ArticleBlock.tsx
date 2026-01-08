'use client';

/**
 * 記事ブロックのフロントエンド表示
 */

import { Block, ArticleBlockConfig } from '@/types/block';
import BlogCard from '@/components/articles/BlogCard';
import Link from 'next/link';

interface ArticleBlockProps {
  block: Block;
  lang?: string;
}

export default function ArticleBlock({ block, lang = 'ja' }: ArticleBlockProps) {
  const config = block.config as ArticleBlockConfig;
  
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
