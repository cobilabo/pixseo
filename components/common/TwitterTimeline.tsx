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
      // Twitterウィジェットのスクリプトを読み込み
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      document.body.appendChild(script);

      return () => {
        // クリーンアップ
        const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
        if (existingScript) {
          document.body.removeChild(existingScript);
        }
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
            href={`https://twitter.com/${username}?ref_src=twsrc%5Etfw`}
          >
            Loading...
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

