'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/firebase/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/admin/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const navigation = [
    { 
      name: 'ダッシュボード', 
      href: '/admin',
      exact: true, // 完全一致のみアクティブ
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: '記事管理', 
      href: '/admin/articles', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      subItems: [
        { name: '記事一覧', href: '/admin/articles' },
        { name: '新規記事', href: '/admin/articles/new' },
      ]
    },
    { 
      name: 'カテゴリー管理', 
      href: '/admin/categories', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    { 
      name: 'タグ管理', 
      href: '/admin/tags', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-blue-50">
      {/* サイドバー */}
      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out z-40
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        flex flex-col
      `}>
        {/* ロゴ */}
        <div className="p-4 border-b">
          <Link href="/admin" className="text-xl font-bold text-blue-600">
            ふらっと。管理画面
          </Link>
        </div>

        {/* モバイル用ハンバーガーボタン */}
        <div className="lg:hidden p-4 border-b">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* ナビゲーションメニュー */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navigation.map((item) => {
            // ダッシュボードは完全一致のみ、他はパスで判定
            const isActive = item.exact 
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <div key={item.name} className="mb-1">
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-3 py-2.5 text-sm font-medium transition-all rounded-xl mx-2
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
                {item.subItems && isActive && (
                  <div className="mt-1 ml-2">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center px-3 py-2 pl-12 text-sm transition-all rounded-xl mx-2
                          ${pathname === subItem.href
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* フッター（ログイン情報とログアウトボタン） */}
        <div className="border-t p-4 space-y-2">
          <div className="text-sm text-gray-600 truncate">{user?.email}</div>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* オーバーレイ（モバイル） */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
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

