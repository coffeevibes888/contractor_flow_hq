import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getDispute, getAdminUsers } from '@/lib/actions/dispute.actions';
import { convertToPlainObject } from '@/lib/utils';
import DisputeDetailView from './dispute-detail-view';

export const metadata: Metadata = {
  title: 'Dispute Details | Dispute Center',
};

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
    return redirect('/unauthorized');
  }

  const [disputeResult, adminsResult] = await Promise.all([
    getDispute(id),
    getAdminUsers(),
  ]);

  if (!disputeResult.success || !disputeResult.dispute) {
    return notFound();
  }

  const dispute = convertToPlainObject(disputeResult.dispute);
  const admins = adminsResult.success ? convertToPlainObject(adminsResult.admins) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <DisputeDetailView 
        dispute={dispute as any} 
        admins={admins as any}
        currentUser={session.user}
      />
    </div>
  );
}
