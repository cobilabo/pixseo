import Link from 'next/link';
import Image from 'next/image';
import { SiteInfo } from '@/lib/firebase/media-tenant-helper';
import { MenuSettings } from '@/types/theme';
import HamburgerMenu from './HamburgerMenu';

interface MediaHeaderProps {
  siteName: string;
  siteInfo?: SiteInfo;
  menuSettings?: MenuSettings;
  menuBackgroundColor?: string;
  menuTextColor?: string;
}

export default function MediaHeader({ 
  siteName, 
  siteInfo,
  menuSettings = {
    topLabel: 'トップ',
    articlesLabel: '記事一覧',
    searchLabel: '検索',
    customMenus: [],
  },
  menuBackgroundColor = '#1f2937',
  menuTextColor = '#ffffff',
}: MediaHeaderProps) {
  return (
    <header className="fixed top-4 left-4 right-4 z-50 rounded-full shadow-lg backdrop-blur-md bg-white/90" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          <Link href="/media" className="flex items-center space-x-3">
            <div className="flex items-center gap-3">
              {siteInfo?.faviconUrl && (
                <Image
                  src={siteInfo.faviconUrl}
                  alt={`${siteName} アイコン`}
                  width={32}
                  height={32}
                  className="w-8 h-8"
                  priority
                  unoptimized={siteInfo.faviconUrl.endsWith('.svg')}
                />
              )}
              {siteInfo?.logoUrl ? (
                <Image
                  src={siteInfo.logoUrl}
                  alt={siteName}
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                  priority
                  unoptimized={siteInfo.logoUrl.endsWith('.svg')}
                />
              ) : (
                <span className="text-xl font-bold text-gray-900">
                  {siteName}
                </span>
              )}
            </div>
          </Link>
          <HamburgerMenu
            menuSettings={menuSettings}
            menuBackgroundColor={menuBackgroundColor}
            menuTextColor={menuTextColor}
          />
        </div>
      </div>
    </header>
  );
}

