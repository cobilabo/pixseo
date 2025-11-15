'use client';

import { useEffect, useRef, useState } from 'react';

interface TwitterTimelineProps {
  username: string;
}

export default function TwitterTimeline({ username }: TwitterTimelineProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      // 既に読み込まれているかチェック
      const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
      if (existingScript) {
        console.log('[TwitterTimeline] Widget script already loaded');
        // 既存のウィジェットを再レンダリング
        if ((window as any).twttr?.widgets) {
          (window as any).twttr.widgets.load();
        }
        return;
      }

      // Twitterウィジェットのスクリプトを読み込み
      console.log('[TwitterTimeline] Loading Twitter widget script...');
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      
      script.onload = () => {
        console.log('[TwitterTimeline] Widget script loaded successfully');
      };
      
      script.onerror = () => {
        console.error('[TwitterTimeline] Failed to load widget script (possible rate limit or network error)');
      };
      
      document.body.appendChild(script);

      return () => {
        // クリーンアップは行わない（ページ全体で共有）
      };
    }
  }, [isVisible]);

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
        X（Twitter）
      </h3>
      {isVisible ? (
        <div className="overflow-hidden">
          <a
            className="twitter-timeline"
            data-height="500"
            data-theme="light"
            data-chrome="noheader nofooter noborders"
            href={`https://x.com/${username}?ref_src=twsrc%5Etfw`}
          >
            Tweets by {username}
          </a>
        </div>
      ) : (
        <div className="h-[500px] flex items-center justify-center bg-gray-50 rounded">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      )}
    </div>
  );
}

