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
  const cardStyles = {
    wrapper: {
      margin: '16px 0',
      display: 'block',
    } as React.CSSProperties,
    link: {
      display: 'flex',
      height: '150px',
      border: '1px solid #e5e7eb',
      borderRadius: '0',
      textDecoration: 'none',
      backgroundColor: '#fff',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    } as React.CSSProperties,
    thumbnail: {
      width: '150px',
      height: '150px',
      minWidth: '150px',
      maxWidth: '150px',
      minHeight: '150px',
      maxHeight: '150px',
      borderRadius: '0',
      margin: '0',
      padding: '0',
      position: 'relative' as const,
      backgroundColor: '#f3f4f6',
      flexShrink: 0,
    } as React.CSSProperties,
    image: {
      borderRadius: '0',
      objectFit: 'cover' as const,
    } as React.CSSProperties,
    content: {
      flex: '1',
      minWidth: '0',
      display: 'flex',
      flexDirection: 'column' as const,
      padding: '12px 16px',
      gap: '4px',
      justifyContent: 'center',
    } as React.CSSProperties,
    meta: {
      fontSize: '11px',
      color: '#6b7280',
      margin: '0',
      padding: '0',
      border: 'none',
      lineHeight: '1.4',
      fontWeight: 'normal' as const,
    } as React.CSSProperties,
    date: {
      color: '#f97316',
      fontWeight: '500' as const,
    } as React.CSSProperties,
    title: {
      fontSize: '13px',
      fontWeight: '700' as const,
      color: '#111827',
      margin: '0',
      padding: '0',
      border: 'none',
      borderBottom: 'none',
      lineHeight: '1.4',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      textDecoration: 'none',
    } as React.CSSProperties,
    description: {
      fontSize: '11px',
      color: '#4b5563',
      margin: '0',
      padding: '0',
      border: 'none',
      lineHeight: '1.5',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      fontWeight: 'normal' as const,
    } as React.CSSProperties,
  };

  return (
    <div className="not-prose" style={cardStyles.wrapper}>
      <Link href={href} style={cardStyles.link}>
        {/* サムネイル（正方形 150x150） */}
        <div style={cardStyles.thumbnail}>
          {data?.featuredImage ? (
            <Image
              src={data.featuredImage}
              alt={data.title || ''}
              fill
              style={cardStyles.image}
              sizes="150px"
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#e5e7eb'
            }}>
              <svg style={{ width: '32px', height: '32px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div style={cardStyles.content}>
          {/* 最上段: 投稿日・ライター名 */}
          <p style={cardStyles.meta}>
            {data?.publishedDate && (
              <span style={cardStyles.date}>{data.publishedDate}</span>
            )}
            {data?.publishedDate && data?.writerName && (
              <span style={{ margin: '0 4px' }}>|</span>
            )}
            {data?.writerName && (
              <span>{data.writerName}</span>
            )}
          </p>
          
          {/* 中段: タイトル */}
          <div style={cardStyles.title}>
            {data?.title || '記事'}
          </div>
          
          {/* 最下段: 見出し（メタディスクリプション） */}
          {data?.metaDescription && (
            <p style={cardStyles.description}>
              {data.metaDescription}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

