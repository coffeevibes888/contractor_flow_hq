import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDisputes, getDisputeStats } from '@/lib/actions/dispute.actions';
import { convertToPlainObject } from '@/lib/utils';
import DisputeCenterDashboard from './dispute-center-dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dispute Center',
  description: 'Contractor Marketplace Dispute Resolution Center',
};

export default async function DisputeCenterPage() {
  const session = await auth();

  if (!session) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
    return redirect('/unauthorized');
  }

  const [disputesResult, statsResult] = await Promise.all([
    getDisputes(),
    getDisputeStats(),
  ]);

  const disputes = disputesResult.success ? convertToPlainObject(disputesResult.disputes) : [];
  const stats = statsResult.success ? convertToPlainObject(statsResult.stats) : null;

  return (
    <DisputeCenterDashboard
      disputes={disputes as any}
      stats={stats as any}
      currentUser={session.user}
    />
  );
}
