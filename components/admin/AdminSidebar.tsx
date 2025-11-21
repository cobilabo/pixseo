'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface MenuItem {
  name: string;
  href: string;
  exact?: boolean;
  icon: React.ReactNode;
}

interface AdminSidebarProps {
  pathname: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userEmail: string | null | undefined;
  userLogoUrl: string;
  isSuperAdmin: boolean;
  currentTenantName: string | undefined;
  currentTenantSlug: string | undefined;
  tenants: Array<{ id: string; name: string; slug: string }>;
  onTenantChange: (tenantId: string) => void;
  onSignOut: () => void;
}

// サイドバーコンポーネント（メモ化）
const AdminSidebar = memo(function AdminSidebar({
  pathname,
  sidebarOpen,
  setSidebarOpen,
  userEmail,
  userLogoUrl,
  isSuperAdmin,
  currentTenantName,
  currentTenantSlug,
  tenants,
  onTenantChange,
  onSignOut,
}: AdminSidebarProps) {
  // セクション1: ダッシュボード、アカウント
  const section1Navigation: MenuItem[] = [
    { 
      name: 'ダッシュボード', 
      href: '/',
      exact: true,
      icon: (
        <Image 
          src="/dashboard.png" 
          alt="ダッシュボード" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'アカウント', 
      href: '/accounts',
      icon: (
        <Image 
          src="/account.svg" 
          alt="アカウント" 
          width={20}
          height={20}
          priority
        />
      )
    },
  ];

  // セクション2: アーティクル、カテゴリー、タグ、ライター
  const section2Navigation: MenuItem[] = [
    { 
      name: 'アーティクル', 
      href: '/articles', 
      icon: (
        <Image 
          src="/article.svg" 
          alt="アーティクル" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'カテゴリー', 
      href: '/categories',
      icon: (
        <Image 
          src="/category.svg" 
          alt="カテゴリー" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'タグ', 
      href: '/tags',
      icon: (
        <Image 
          src="/tags.svg" 
          alt="タグ" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'ライター', 
      href: '/writers',
      icon: (
        <Image 
          src="/writer.svg" 
          alt="ライター" 
          width={20}
          height={20}
          priority
        />
      )
    },
  ];

  // セクション3: サイト、ページ、テーマ、メディア
  const section3Navigation: MenuItem[] = [
    { 
      name: 'サイト', 
      href: '/site',
      icon: (
        <Image 
          src="/site.svg" 
          alt="サイト" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'ページ', 
      href: '/pages',
      icon: (
        <Image 
          src="/article.svg" 
          alt="ページ" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'テーマ', 
      href: '/theme',
      icon: (
        <Image 
          src="/design.svg" 
          alt="テーマ" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'メディア', 
      href: '/media-library',
      icon: (
        <Image 
          src="/media.svg" 
          alt="メディア" 
          width={20}
          height={20}
          priority
        />
      )
    },
  ];

  // サービス管理メニュー（super_adminのみ）
  const serviceNavigation: MenuItem[] = isSuperAdmin ? [
    { 
      name: 'サービス', 
      href: '/service',
      icon: (
        <Image 
          src="/padlock.svg" 
          alt="サービス" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'クライアント', 
      href: '/clients',
      icon: (
        <Image 
          src="/padlock.svg" 
          alt="クライアント" 
          width={20}
          height={20}
          priority
        />
      )
    },
  ] : [];

  return (
    <aside className={`
      fixed top-0 left-0 bottom-0 w-64 bg-white transform transition-transform duration-200 ease-in-out z-40
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
      flex flex-col
    `}>
      {/* ロゴ */}
      <div className="pt-8 pb-4 px-4 flex items-center justify-center">
        <Link href="/" className="flex items-center justify-center">
          <Image 
            src="/logo_yoko_b_1.svg" 
            alt="PixSEO 管理画面" 
            width={180}
            height={48}
            priority
            style={{ height: 'auto' }}
          />
        </Link>
      </div>

      {/* サービス選択プルダウン（super_adminのみ） */}
      {isSuperAdmin && tenants.length > 0 && (
        <div className="px-3 py-4">
          <div className="flex">
            <select
              value={tenants.find(t => t.name === currentTenantName)?.id || ''}
              onChange={(e) => onTenantChange(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%234b5563' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem',
              }}
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            
            {/* サイトビューボタン */}
            {currentTenantSlug && (
              <a
                href={`https://${currentTenantSlug}.pixseo-preview.cloud`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-r-lg hover:bg-blue-700 transition-colors flex items-center justify-center border border-l-0 border-blue-600"
                title="サイトを表示"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ナビゲーションメニュー */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* セクション1: ダッシュボード、アカウント */}
        <div className="mb-4 p-2 bg-[#f1f6f9] rounded-lg">
          {section1Navigation.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href || pathname === item.href + '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <div key={item.name} className="mb-1 last:mb-0">
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-3 py-2.5 text-sm transition-all rounded-xl font-bold
                    ${isActive 
                      ? 'bg-white text-gray-900 shadow-custom' 
                      : 'text-gray-600 hover:bg-white hover:bg-opacity-50'
                    }
                  `}
                >
                  <span 
                    className="mr-3"
                    style={isActive ? {} : { filter: 'brightness(0) saturate(100%) invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(94%) contrast(89%)' }}
                  >
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              </div>
            );
          })}
        </div>

        {/* セクション2: アーティクル、カテゴリー、タグ、ライター */}
        <div className="mb-4 p-2 bg-[#f1f6f9] rounded-lg">
          {section2Navigation.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href || pathname === item.href + '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <div key={item.name} className="mb-1 last:mb-0">
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-3 py-2.5 text-sm transition-all rounded-xl font-bold
                    ${isActive 
                      ? 'bg-white text-gray-900 shadow-custom' 
                      : 'text-gray-600 hover:bg-white hover:bg-opacity-50'
                    }
                  `}
                >
                  <span 
                    className="mr-3"
                    style={isActive ? {} : { filter: 'brightness(0) saturate(100%) invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(94%) contrast(89%)' }}
                  >
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              </div>
            );
          })}
        </div>

        {/* セクション3: サイト、デザイン、ブロック、メディア */}
        <div className="mb-4 p-2 bg-[#f1f6f9] rounded-lg">
          {section3Navigation.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href || pathname === item.href + '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <div key={item.name} className="mb-1 last:mb-0">
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-3 py-2.5 text-sm transition-all rounded-xl font-bold
                    ${isActive 
                      ? 'bg-white text-gray-900 shadow-custom' 
                      : 'text-gray-600 hover:bg-white hover:bg-opacity-50'
                    }
                  `}
                >
                  <span 
                    className="mr-3"
                    style={isActive ? {} : { filter: 'brightness(0) saturate(100%) invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(94%) contrast(89%)' }}
                  >
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              </div>
            );
          })}
        </div>

        {/* サービス管理メニュー（super_adminのみ） */}
        {serviceNavigation.length > 0 && (
          <div className="mb-4">
            {serviceNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <div key={item.name} className="mb-1">
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center px-3 py-2.5 text-sm transition-all rounded-xl font-bold
                      ${isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span 
                      className="mr-3"
                      style={isActive ? { filter: 'brightness(0) invert(1)' } : { filter: 'brightness(0) saturate(100%) invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(94%) contrast(89%)' }}
                    >
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* フッター（ログイン情報・ログアウトボタン） */}
      <div className="p-4 space-y-3">
        {/* ログイン情報 */}
        <div className="flex items-center gap-3">
          {userLogoUrl ? (
            <Image 
              src={userLogoUrl} 
              alt="User"
              width={40}
              height={40}
              className="rounded-full object-cover"
              priority
            />
          ) : userEmail === 'admin@pixseo.cloud' ? (
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
              <Image 
                src="/symbol_w_1.svg" 
                alt="Admin"
                width={24}
                height={24}
                priority
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300"></div>
          )}
          <div className="text-sm text-gray-600 truncate flex-1">{userEmail}</div>
        </div>
        
        {/* ログアウトボタン */}
        <button
          onClick={onSignOut}
          className="w-full px-4 py-2 text-sm text-gray-400 bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ログアウト
        </button>
        
        {/* Powered by */}
        <div className="text-center text-xs text-gray-400">
          powered by cobilabo
        </div>
      </div>
    </aside>
  );
});

export default AdminSidebar;

