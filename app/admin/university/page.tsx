import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { UniversityHome } from './university-home';

export const metadata: Metadata = {
  title: 'PM University | Property Flow HQ',
  description: 'Learn everything about managing your properties, tenants, and finances.',
};

export default async function UniversityPage() {
  await requireAdmin();
  return <UniversityHome />;
}
