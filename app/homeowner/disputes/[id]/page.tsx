import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getDispute } from '@/lib/actions/dispute.actions';
import { convertToPlainObject } from '@/lib/utils';
import UserDisputeDetailView from '@/components/disputes/user-dispute-detail-view';

export const metadata = {
  title: 'Dispute Details | Homeowner',
};

export default async function HomeownerDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  const disputeResult = await getDispute(id);

  if (!disputeResult.success || !disputeResult.dispute) {
    return notFound();
  }

  const dispute = convertToPlainObject(disputeResult.dispute);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <UserDisputeDetailView 
          dispute={dispute as any} 
          backUrl="/homeowner/disputes"
        />
      </div>
    </div>
  );
}
