'use client';

import { useState, useMemo, useEffect, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  const [userLogoUrl, setUserLogoUrl] = useState<string>('');

  const isSuperAdmin = userRole === 'super_admin';

  // ユーザーのロゴURLを取得（キャッシュ付き）
  useEffect(() => {
    if (!user?.uid) return;

    // キャッシュから取得
    const cachedLogo = sessionStorage.getItem(`userLogo_${user.uid}`);
    if (cachedLogo) {
      setUserLogoUrl(cachedLogo);
      return;
    }

    // APIから取得
    fetch(`/api/admin/users/${user.uid}`)
      .then(res => res.json())
      .then(data => {
        if (data.logoUrl) {
          setUserLogoUrl(data.logoUrl);
          sessionStorage.setItem(`userLogo_${user.uid}`, data.logoUrl);
        }
      })
      .catch(error => {
        console.error('Error fetching user logo:', error);
      });
  }, [user?.uid]);

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
        <Image 
          src="/home.svg" 
          alt="ホーム" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: '記事管理', 
      href: '/admin/articles', 
      icon: (
        <Image 
          src="/article.svg" 
          alt="記事管理" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'カテゴリー管理', 
      href: '/admin/categories', 
      icon: (
        <Image 
          src="/category.svg" 
          alt="カテゴリー管理" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'タグ管理', 
      href: '/admin/tags', 
      icon: (
        <Image 
          src="/tags.svg" 
          alt="タグ管理" 
          width={20}
          height={20}
          priority
        />
      )
    },
    { 
      name: 'ライター管理', 
      href: '/admin/writers', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
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
      name: 'デザイン', 
      href: '/admin/design', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
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
    { 
      name: 'クライアント管理', 
      href: '/admin/clients', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
            <Image 
              src="/logo.png" 
              alt="PixSEO 管理画面" 
              width={120}
              height={32}
              priority
              style={{ height: 'auto' }}
            />
          </Link>
        </div>

        {/* サービス選択プルダウン（super_adminのみ） */}
        {isSuperAdmin && tenants.length > 0 && (
          <div className="px-3 py-4 border-b">
            <div className="flex">
              <select
                value={currentTenant?.id || ''}
                onChange={(e) => {
                  const tenant = tenants.find(t => t.id === e.target.value);
                  if (tenant) setCurrentTenant(tenant);
                }}
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
              <a
                href={`https://${currentTenant?.slug}.pixseo.cloud`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-r-lg hover:bg-blue-700 transition-colors flex items-center justify-center border border-l-0 border-blue-600"
                title="サイトを表示"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}

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
        <div className="border-t p-4 space-y-3">
          {/* ログイン情報 */}
          <div className="flex items-center gap-3">
            {userLogoUrl ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image 
                  src={userLogoUrl} 
                  alt="User"
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300"></div>
            )}
            <div className="text-sm text-gray-600 truncate flex-1">{user?.email}</div>
          </div>
          
          {/* ログアウトボタン */}
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm font-bold text-white bg-gray-600 rounded-full hover:bg-gray-700 transition-colors"
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
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
