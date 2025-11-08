'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { MediaTenantProvider } from '@/contexts/MediaTenantContext';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <MediaTenantProvider>
        {children}
      </MediaTenantProvider>
    </AuthProvider>
  );
}

