'use client';

import Image from 'next/image';
import { FirstViewSettings } from '@/types/theme';

interface FirstViewProps {
  settings: FirstViewSettings;
  customTitle?: string;
  customSubtitle?: string;
  showCustomContent?: boolean;
  customMeta?: string | { published?: string; updated?: string; views?: string; readingTime?: string; }; // 記事の公開日・更新日・閲覧数などのメタ情報
  writerIcon?: string; // ライターアイコン
}

export default function FirstView({ settings, customTitle, customSubtitle, showCustomContent = false, customMeta, writerIcon }: FirstViewProps) {
  // FV画像が設定されていない場合、ライターアイコンがあれば表示、なければ非表示
  if (!settings.imageUrl && !writerIcon) {
    return null;
  }

  return (
    <>
      {/* 背景画像（画面上部固定・最背面） */}
      {settings.imageUrl && (
        <div className="fixed top-0 left-0 right-0 h-[700px] overflow-hidden" style={{ zIndex: 0 }}>
          <Image
            src={settings.imageUrl}
            alt="First View"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-black bg-opacity-60" />
        </div>
      )}

      {/* テキストコンテンツ（通常スクロール） */}
      <div className="relative w-full h-[700px] -mb-40" style={{ zIndex: 1 }}>
        <div className="flex flex-col items-center justify-center text-white px-4 h-full" style={{ paddingTop: '40px' }}>
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
                <h1 
                  className="font-bold text-center mb-4 drop-shadow-lg"
                  style={{ fontSize: writerIcon ? undefined : '1.5em' }}
                >
                  {writerIcon ? (
                    <span className="text-4xl md:text-5xl">{customTitle}</span>
                  ) : (
                    customTitle
                  )}
                </h1>
              )}
              {customMeta && (
                typeof customMeta === 'string' ? (
                  <p className="text-sm text-gray-200 drop-shadow-md">
                    {customMeta}
                  </p>
                ) : (
                  <div className="flex flex-col md:flex-row md:gap-2 text-sm text-gray-200 drop-shadow-md text-center md:text-left">
                    {customMeta.published && <span>{customMeta.published}</span>}
                    {customMeta.updated && <span className="hidden md:inline">•</span>}
                    {customMeta.updated && <span>{customMeta.updated}</span>}
                    {customMeta.views && <span className="hidden md:inline">•</span>}
                    {customMeta.views && <span>{customMeta.views}</span>}
                    {customMeta.readingTime && <span className="hidden md:inline">•</span>}
                    {customMeta.readingTime && <span>{customMeta.readingTime}</span>}
                  </div>
                )
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
              <p className="text-xs md:text-lg text-center max-w-3xl drop-shadow-md whitespace-pre-line leading-relaxed tracking-wide">
                {settings.description}
              </p>
            )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

