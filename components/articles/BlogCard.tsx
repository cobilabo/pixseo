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

  // ローディング中（モバイルは縦並び・サムネ全幅 / sm以上は横並び）
  if (loading) {
    return (
      <div className="my-4 block">
        <div className="flex flex-col sm:flex-row sm:items-stretch border border-gray-200 overflow-hidden animate-pulse min-h-[120px]">
          <div className="bg-gray-200 w-full sm:w-[min(240px,42vw)] sm:flex-shrink-0 aspect-[4/3]" aria-hidden />
          <div className="flex-1 p-4 space-y-2 min-w-0">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-2.5 bg-gray-200 rounded w-full"></div>
            <div className="flex justify-between gap-2 pt-1">
              <div className="h-2 bg-gray-200 rounded w-1/3"></div>
              <div className="h-2 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ブログカード表示（専用クラス名を使用してproseスタイルをオーバーライド）
  return (
    <div className="blogcard-wrapper">
      {/* ラベル */}
      <div className="blogcard-label">
        <svg className="blogcard-label-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <span>関連記事</span>
      </div>
      <Link href={href} className="blogcard-link">
        {/* サムネイル（4:3・contain で見切れ防止） */}
        <div className="blogcard-thumbnail">
          {data?.featuredImage ? (
            <Image
              src={data.featuredImage}
              alt={data.title || ''}
              fill
              className="object-contain"
              sizes="(max-width: 639px) 100vw, 240px"
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

        {/* コンテンツ: タイトル → 要約 → ライター（左）・日付（右） */}
        <div className="blogcard-content">
          <div className="blogcard-title">{data?.title || '記事'}</div>
          {data?.metaDescription ? (
            <p className="blogcard-description">{data.metaDescription}</p>
          ) : null}
          {data?.writerName || data?.publishedDate ? (
            <div className="blogcard-meta blogcard-meta-footer">
              <span className="blogcard-writer">{data?.writerName ?? ''}</span>
              {data?.publishedDate ? (
                <time className="blogcard-date" dateTime={data.publishedDate}>
                  {data.publishedDate}
                </time>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
    </div>
  );
}

