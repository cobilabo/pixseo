'use client';

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

