import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import {
  getSecurityMetrics,
  getFinanceMetrics,
  getGrowthMetrics,
  getReliabilityMetrics,
  getPIIAccessSummary,
} from '@/lib/actions/super-admin-enhanced.actions';
import { convertToPlainObject } from '@/lib/utils';
import InsightsClient from './insights-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Operational Insights · Super Admin',
};

export default async function SuperAdminInsightsPage() {
  const session = await auth();
  if (!session) return redirect('/sign-in');
  if (session.user?.role !== 'superAdmin') return redirect('/unauthorized');

  const [security, finance, growth, reliability, pii] = await Promise.all([
    getSecurityMetrics(),
    getFinanceMetrics(),
    getGrowthMetrics(),
    getReliabilityMetrics(),
    getPIIAccessSummary(),
  ]);

  return (
    <InsightsClient
      security={convertToPlainObject(security) as any}
      finance={convertToPlainObject(finance) as any}
      growth={convertToPlainObject(growth) as any}
      reliability={convertToPlainObject(reliability) as any}
      pii={convertToPlainObject(pii) as any}
    />
  );
}
