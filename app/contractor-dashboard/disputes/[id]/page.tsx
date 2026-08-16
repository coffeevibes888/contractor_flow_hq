import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getDispute } from '@/lib/actions/dispute.actions';
import { convertToPlainObject } from '@/lib/utils';
import UserDisputeDetailView from '@/components/disputes/user-dispute-detail-view';

export const metadata = {
  title: 'Dispute Details | Contractor Portal',
};

export default async function ContractorDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'contractor') {
    return redirect('/');
  }

  const disputeResult = await getDispute(id);

  if (!disputeResult.success || !disputeResult.dispute) {
    return notFound();
  }

  const dispute = convertToPlainObject(disputeResult.dispute);

  return (
    <div className="max-w-4xl mx-auto">
      <UserDisputeDetailView 
        dispute={dispute as any} 
        backUrl="/contractor-dashboard/disputes"
      />
    </div>
  );
}
