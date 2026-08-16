import { requireAdmin } from '@/lib/auth-guard';
import { Metadata } from 'next';
import { BulkImportClient } from '@/components/admin/bulk-import-client';

export const metadata: Metadata = {
  title: 'Bulk Import | Property Management',
};

export default async function BulkImportPage() {
  await requireAdmin();
  return <BulkImportClient />;
}
