'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FirstViewSettings } from '@/types/theme';

interface FirstViewProps {
  settings: FirstViewSettings;
}

export default function FirstView({ settings }: FirstViewProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // FV画像が設定されていない場合は表示しない
  if (!settings.imageUrl) {
    return null;
  }

  // パララックス効果: スクロール量の50%で画像を移動
  const parallaxOffset = scrollY * 0.5;

  return (
    <div className="relative w-full -mb-32">
      {/* 背景画像（パララックス効果あり） */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="relative w-full h-full" 
          style={{ 
            transform: `translateY(${parallaxOffset}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
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
        </div>
      </div>
      
      {/* テキストコンテンツ（通常スクロール） */}
      <div className="relative z-10 flex flex-col items-center justify-center text-white px-4 pt-16" style={{ height: '600px' }}>
        {settings.catchphrase && (
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-4 drop-shadow-lg">
            {settings.catchphrase}
          </h1>
        )}
        
        {settings.description && (
          <p className="text-lg md:text-xl text-center max-w-3xl drop-shadow-md whitespace-pre-line">
            {settings.description}
          </p>
        )}
      </div>
    </div>
  );
}

