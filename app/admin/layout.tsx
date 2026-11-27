'use client';

// /api/admin/* への fetch に Firebase ID トークンを付ける（モジュール読み込み時に1回だけ設定）
import '@/lib/admin-fetch-auth';
import { AuthProvider } from '@/contexts/AuthContext';
import { MediaTenantProvider } from '@/contexts/MediaTenantContext';
import { ToastProvider } from '@/contexts/ToastContext';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <MediaTenantProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </MediaTenantProvider>
    </AuthProvider>
  );
}

