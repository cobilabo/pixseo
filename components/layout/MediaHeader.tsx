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
    <header className="bg-white shadow-sm" style={{ backgroundColor: 'var(--header-background-color, #ffffff)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/media" className="flex items-center space-x-3">
            {siteInfo?.logoUrl ? (
              <Image
                src={siteInfo.logoUrl}
                alt={siteName}
                width={150}
                height={40}
                className="h-10 w-auto"
                priority
              />
            ) : (
              <span className="text-2xl font-bold text-gray-900">
                {siteName}
              </span>
            )}
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

