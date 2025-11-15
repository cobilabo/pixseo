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
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.121,9.069,15.536,1.483a5.008,5.008,0,0,0-7.072,0L.879,9.069A2.978,2.978,0,0,0,0,11.19v9.817a3,3,0,0,0,3,3H21a3,3,0,0,0,3-3V11.19A2.978,2.978,0,0,0,23.121,9.069ZM15,22.007H9V18.073a3,3,0,0,1,6,0Zm7-1a1,1,0,0,1-1,1H17V18.073a5,5,0,0,0-10,0v3.934H3a1,1,0,0,1-1-1V11.19a1.008,1.008,0,0,1,.293-.707L9.878,2.9a3.008,3.008,0,0,1,4.244,0l7.585,7.586A1.008,1.008,0,0,1,22,11.19Z"/>
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

