'use client';

import AuthGuard from '@/components/admin/AuthGuard';
import AdminDocsShell from '@/components/admin/docs/AdminDocsShell';
import AdminDocsBody from '@/components/admin/docs/AdminDocsBody';
import { DOC_TOC } from '@/components/admin/docs/toc';

export default function AdminDocsPage() {
  return (
    <AuthGuard>
      <AdminDocsShell tocSections={DOC_TOC}>
        <AdminDocsBody />
      </AdminDocsShell>
    </AuthGuard>
  );
}
