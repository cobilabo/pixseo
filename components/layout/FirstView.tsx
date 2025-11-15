'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FirstViewSettings } from '@/types/theme';

interface FirstViewProps {
  settings: FirstViewSettings;
  customTitle?: string;
  customSubtitle?: string;
  showCustomContent?: boolean;
  customMeta?: string; // 記事の公開日・更新日・閲覧数などのメタ情報
  writerIcon?: string; // ライターアイコン
}

export default function FirstView({ settings, customTitle, customSubtitle, showCustomContent = false, customMeta, writerIcon }: FirstViewProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // FV画像が設定されていない場合、ライターアイコンがあれば表示、なければ非表示
  if (!settings.imageUrl && !writerIcon) {
    return null;
  }

  // パララックス効果: スクロール量の50%で画像を移動
  const parallaxOffset = scrollY * 0.5;

  return (
    <div className="relative w-full h-[700px] -mb-40">
      {/* 背景画像（パララックス効果あり） */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="relative w-full h-full" 
          style={{ 
            transform: `translateY(${parallaxOffset}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          {settings.imageUrl ? (
            <>
              <Image
                src={settings.imageUrl}
                alt="First View"
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
              
              {/* オーバーレイ */}
              <div className="absolute inset-0 bg-black bg-opacity-30" />
            </>
          ) : (
            <div 
              className="w-full h-full" 
              style={{ backgroundColor: 'var(--primary-color, #3b82f6)' }}
            />
          )}
        </div>
      </div>
      
             {/* テキストコンテンツ（通常スクロール） */}
             <div className="relative z-10 flex flex-col items-center justify-center text-white px-4 h-full" style={{ paddingTop: '140px' }}>
        {showCustomContent ? (
          <>
            {writerIcon && (
              <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg mb-8">
                <Image
                  src={writerIcon}
                  alt="Writer Icon"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            {customTitle && (
              <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 drop-shadow-lg">
                {customTitle}
              </h1>
            )}
            {customMeta && (
              <p className="text-base text-gray-200 drop-shadow-md">
                {customMeta}
              </p>
            )}
            {customSubtitle && !customMeta && (
              <p className="text-xs text-gray-200 uppercase tracking-wider drop-shadow-md">
                {customSubtitle}
              </p>
            )}
          </>
        ) : (
          <>
            {settings.catchphrase && (
              <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 drop-shadow-lg">
                {settings.catchphrase}
              </h1>
            )}
            
            {settings.description && (
              <p className="text-base md:text-lg text-center max-w-3xl drop-shadow-md whitespace-pre-line leading-relaxed tracking-wide">
                {settings.description}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

