'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { signOut } from '@/lib/firebase/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const { currentTenant, tenants, setCurrentTenant } = useMediaTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [homeIconError, setHomeIconError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [articleIconError, setArticleIconError] = useState(false);
  const [categoryIconError, setCategoryIconError] = useState(false);
  const [tagIconError, setTagIconError] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/admin/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // サイトごとのメニュー（グループ化）
  const siteNavigation = [
    { 
      name: 'ダッシュボード', 
      href: '/admin',
      exact: true,
      icon: (
        !homeIconError ? (
          <img 
            src="/home.svg" 
            alt="ホーム" 
            className="w-5 h-5"
            onError={() => setHomeIconError(true)}
          />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )
      )
    },
    { 
      name: '記事管理', 
      href: '/admin/articles', 
      icon: (
        !articleIconError ? (
          <img 
            src="/article.svg" 
            alt="記事管理" 
            className="w-5 h-5"
            onError={() => setArticleIconError(true)}
          />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      )
    },
    { 
      name: 'カテゴリー管理', 
      href: '/admin/categories', 
      icon: (
        !categoryIconError ? (
          <img 
            src="/category.svg" 
            alt="カテゴリー管理" 
            className="w-5 h-5"
            onError={() => setCategoryIconError(true)}
          />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        )
      )
    },
    { 
      name: 'タグ管理', 
      href: '/admin/tags', 
      icon: (
        !tagIconError ? (
          <img 
            src="/tags.svg" 
            alt="タグ管理" 
            className="w-5 h-5"
            onError={() => setTagIconError(true)}
          />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )
      )
    },
    { 
      name: 'アカウント管理', 
      href: '/admin/accounts', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      name: 'サイト管理', 
      href: '/admin/site', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      name: 'バナー管理', 
      href: '/admin/banners', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      name: 'メディア管理', 
      href: '/admin/media', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      )
    },
  ];

  // サービス管理メニュー（super_adminのみ）
  const serviceNavigation = isSuperAdmin ? [
    { 
      name: 'サービス管理', 
      href: '/admin/service', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
  ] : [];

  return (
    <div className="min-h-screen bg-blue-50">
      {/* サイドバー */}
      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 bg-white transform transition-transform duration-200 ease-in-out z-40
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        flex flex-col
      `}>
        {/* ロゴ */}
        <div className="p-4 border-b flex items-center justify-center">
          <Link href="/admin" className="flex items-center justify-center">
            {!logoError ? (
              <img 
                src="/logo.svg" 
                alt="PixSEO 管理画面" 
                className="h-8 w-auto"
                style={{ filter: 'brightness(0) saturate(100%) invert(48%) sepia(100%) saturate(2000%) hue-rotate(0deg) brightness(1.1) contrast(1)' }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-8 w-8 bg-orange-500 rounded"></div>
            )}
          </Link>
        </div>

        {/* ナビゲーションメニュー */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {/* サイトメニューグループ */}
          <div className="mb-4 p-2 bg-[#f1f6f9] rounded-lg">
            {siteNavigation.map((item) => {
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
                        ? 'bg-white text-gray-900 shadow-md' 
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
                          ? 'bg-purple-600 text-white' 
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
        <div className="border-t p-4 space-y-3">
          {/* ログイン情報 */}
          <div className="text-sm text-gray-600 truncate">{user?.email}</div>
          
          {/* ログアウトボタン */}
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm font-bold text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* オーバーレイ（モバイル） */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-blue-50 bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <main className="lg:ml-64 min-h-screen">
        {/* super_adminの場合、サービス選択プルダウンを表示 */}
        {isSuperAdmin && tenants.length > 0 && (
          <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-7xl mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理するサービスを選択
              </label>
              <select
                value={currentTenant?.id || ''}
                onChange={(e) => {
                  const tenant = tenants.find(t => t.id === e.target.value);
                  if (tenant) setCurrentTenant(tenant);
                }}
                className="w-full max-w-md px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
