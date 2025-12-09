'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { signOut } from '@/lib/firebase/auth';
import AdminSidebar from './AdminSidebar';

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
  
  // /adminプレフィックスを削除してサイドバーに渡す
  const sidebarPathname = pathname.replace(/^\/admin/, '') || '/';

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

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [router]);

  const handleTenantChange = useCallback((tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      // テナント切り替え後にページをリロードしてコンテンツを更新
      window.location.reload();
    }
  }, [tenants, setCurrentTenant]);

  return (
    <div className="min-h-screen bg-blue-50">
      {/* サイドバー */}
      <AdminSidebar
        pathname={sidebarPathname}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userEmail={user?.email}
        userLogoUrl={userLogoUrl}
        isSuperAdmin={isSuperAdmin}
        currentTenantName={currentTenant?.name}
        currentTenantSlug={currentTenant?.slug}
        currentTenantCustomDomain={currentTenant?.customDomain}
        currentTenantDomainStatus={currentTenant?.domainConfig?.status}
        tenants={tenants}
        onTenantChange={handleTenantChange}
        onSignOut={handleSignOut}
      />

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
