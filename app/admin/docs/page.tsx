'use client';

import { useMemo } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import AdminDocsShell from '@/components/admin/docs/AdminDocsShell';
import AdminDocsBody from '@/components/admin/docs/AdminDocsBody';
import { DOC_TOC, filterDocToc } from '@/components/admin/docs/toc';

export default function AdminDocsPage() {
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';

  const tocSections = useMemo(
    () => filterDocToc(DOC_TOC, isSuperAdmin),
    [isSuperAdmin]
  );

  return (
    <AuthGuard>
      <AdminDocsShell tocSections={tocSections}>
        <AdminDocsBody isSuperAdmin={isSuperAdmin} />
      </AdminDocsShell>
    </AuthGuard>
  );
}
