'use client';

import { useEffect, useState } from 'react';
import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface SocialShareProps {
  title: string;
  url?: string;
  lang?: Lang;
}

export default function SocialShare({ title, url: propUrl, lang = 'ja' }: SocialShareProps) {
  const [url, setUrl] = useState(propUrl || '');

  // タイトルの安全チェック
  const safeTitle = typeof title === 'string' ? title : t('article.share', lang);

  useEffect(() => {
    if (typeof window !== 'undefined' && !propUrl) {
      setUrl(window.location.href);
    }
  }, [propUrl]);

  const shareOnX = () => {
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(safeTitle)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, '_blank', 'width=550,height=420');
  };

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
  };

  const shareOnLine = () => {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
    window.open(lineUrl, '_blank', 'width=550,height=420');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert(t('common.copied', lang));
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="mb-8">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{t('article.share', lang)}</h3>
        <p className="text-xs text-gray-500 uppercase tracking-wider">Share This Article</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* X */}
        <button
          onClick={shareOnX}
          className="flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Xでシェア"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="font-medium">X</span>
        </button>

        {/* Facebook */}
        <button
          onClick={shareOnFacebook}
          className="flex items-center justify-center gap-2 bg-[#0e5aa8] text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity"
          aria-label="Facebookでシェア"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
          </svg>
          <span className="font-medium">Facebook</span>
        </button>

        {/* LINE */}
        <button
          onClick={shareOnLine}
          className="flex items-center justify-center gap-2 bg-[#008a00] text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity"
          aria-label="LINEでシェア"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          <span className="font-medium">LINE</span>
        </button>

        {/* URL コピー */}
        <button
          onClick={copyToClipboard}
          className="flex items-center justify-center gap-2 bg-gray-700 text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity"
          aria-label="URLをコピー"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">{t('common.copy', lang)}</span>
        </button>
      </div>
    </div>
  );
}

