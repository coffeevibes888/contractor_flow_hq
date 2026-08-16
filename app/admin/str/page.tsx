import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import STRDashboardClient from './str-dashboard-client';

export const metadata: Metadata = {
  title: 'Short-Term Rental Dashboard',
};

const STRDashboardPage = async () => {
  await requireAdmin();

  return <STRDashboardClient />;
};

export default STRDashboardPage;
