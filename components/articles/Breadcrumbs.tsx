'use client';

import Link from 'next/link';
import { Article, Category } from '@/types/article';
import { useEffect, useState } from 'react';

interface BreadcrumbsProps {
  article: Article;
  category?: Category | null;
}

export default function Breadcrumbs({ article, category }: BreadcrumbsProps) {
  const [origin, setOrigin] = useState('https://furatto.pixseo.cloud');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);
  
  // JSON-LD構造化データ
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'トップ',
        item: origin,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '記事一覧',
        item: `${origin}/articles`,
      },
      ...(category ? [{
        '@type': 'ListItem',
        position: 3,
        name: category.name,
        item: `${origin}/categories/${category.slug}`,
      }] : []),
      {
        '@type': 'ListItem',
        position: category ? 4 : 3,
        name: article.title,
      },
    ],
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* 視覚的なパンくずリスト */}
      <nav aria-label="パンくずリスト" className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-gray-600">
          <li>
            <Link 
              href="/" 
              className="hover:text-blue-600 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              トップ
            </Link>
          </li>
          
          <li className="flex items-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>

          <li>
            <Link 
              href="/articles" 
              className="hover:text-blue-600 transition-colors"
            >
              記事一覧
            </Link>
          </li>

          {category && (
            <>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </li>

              <li>
                <Link 
                  href={`/categories/${category.slug}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {category.name}
                </Link>
              </li>
            </>
          )}

          <li className="flex items-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>

          <li className="text-gray-900 font-medium truncate max-w-xs">
            {article.title}
          </li>
        </ol>
      </nav>
    </>
  );
}

