'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface BlogCardData {
  title: string;
  featuredImage?: string;
  metaDescription?: string;
  writerName?: string;
  publishedDate?: string;
  slug: string;
  lang: string;
}

interface BlogCardProps {
  href: string;
  lang: string;
}

// URLからスラッグを抽出する
function extractSlugFromUrl(url: string): string | null {
  // /ja/articles/slug, /en/articles/slug など
  const match = url.match(/\/(?:ja|en|zh|ko)\/articles\/([^\/\?#]+)/);
  if (match) return match[1];
  
  // /articles/slug の形式
  const simpleMatch = url.match(/\/articles\/([^\/\?#]+)/);
  if (simpleMatch) return simpleMatch[1];
  
  // WordPressの古い形式 /2024/01/10/slug/
  const wpMatch = url.match(/\/\d{4}\/\d{2}\/\d{2}\/([^\/\?#]+)/);
  if (wpMatch) return wpMatch[1];
  
  return null;
}

export default function BlogCard({ href, lang }: BlogCardProps) {
  const [data, setData] = useState<BlogCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchArticleData = async () => {
      const slug = extractSlugFromUrl(href);
      if (!slug) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/articles/blogcard?slug=${encodeURIComponent(slug)}&lang=${lang}`);
        if (!response.ok) {
          throw new Error('Failed to fetch article data');
        }
        const articleData = await response.json();
        setData(articleData);
      } catch (e) {
        console.error('Failed to fetch blog card data:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [href, lang]);

  // エラー時やデータ取得失敗時は通常のリンクを表示
  if (error || (!loading && !data)) {
    return (
      <a href={href} className="text-blue-600 hover:underline">
        {href}
      </a>
    );
  }

  // ローディング中
  if (loading) {
    return (
      <div className="my-4 block">
        <div className="flex border border-gray-200 overflow-hidden animate-pulse" style={{ height: '150px' }}>
          <div className="bg-gray-200 flex-shrink-0" style={{ width: '150px', height: '150px' }}></div>
          <div className="flex-1 p-4 space-y-2">
            <div className="h-2.5 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-2.5 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // ブログカード表示
  return (
    <div className="my-4 block not-prose" style={{ margin: '16px 0' }}>
      <Link
        href={href}
        className="flex overflow-hidden hover:shadow-md transition-shadow duration-200 no-underline group bg-white"
        style={{ 
          height: '150px', 
          border: '1px solid #e5e7eb', 
          borderRadius: '0',
          textDecoration: 'none'
        }}
      >
        {/* サムネイル（正方形 150x150） */}
        <div 
          className="flex-shrink-0 relative bg-gray-100" 
          style={{ 
            width: '150px', 
            height: '150px', 
            borderRadius: '0',
            margin: '0',
            padding: '0'
          }}
        >
          {data?.featuredImage ? (
            <Image
              src={data.featuredImage}
              alt={data.title || ''}
              fill
              className="object-cover"
              style={{ borderRadius: '0' }}
              sizes="150px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div 
          className="flex-1 min-w-0 flex flex-col"
          style={{ padding: '12px 16px', gap: '6px' }}
        >
          {/* 最上段: 投稿日・ライター名 */}
          <p style={{ 
            fontSize: '11px', 
            color: '#6b7280', 
            margin: '0', 
            padding: '0',
            border: 'none',
            lineHeight: '1.4'
          }}>
            {data?.publishedDate && (
              <span style={{ color: '#f97316', fontWeight: '500' }}>{data.publishedDate}</span>
            )}
            {data?.publishedDate && data?.writerName && (
              <span style={{ margin: '0 4px' }}>|</span>
            )}
            {data?.writerName && (
              <span>{data.writerName}</span>
            )}
          </p>
          
          {/* 中段: タイトル */}
          <h4 
            className="group-hover:text-orange-500 transition-colors"
            style={{ 
              fontSize: '13px', 
              fontWeight: '700', 
              color: '#111827', 
              margin: '0', 
              padding: '0',
              border: 'none',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {data?.title || '記事'}
          </h4>
          
          {/* 最下段: 見出し（メタディスクリプション） */}
          {data?.metaDescription && (
            <p style={{ 
              fontSize: '11px', 
              color: '#4b5563', 
              margin: '0', 
              padding: '0',
              border: 'none',
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {data.metaDescription}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

