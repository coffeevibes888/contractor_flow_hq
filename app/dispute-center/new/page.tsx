import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getLandlordsForDispute } from '@/lib/actions/dispute.actions';
import { convertToPlainObject } from '@/lib/utils';
import NewDisputeForm from './new-dispute-form';

export const metadata: Metadata = {
  title: 'New Dispute | Dispute Center',
};

export default async function NewDisputePage() {
  const session = await auth();

  if (!session) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
    return redirect('/unauthorized');
  }

  const landlordsResult = await getLandlordsForDispute();
  const landlords = landlordsResult.success ? convertToPlainObject(landlordsResult.landlords) : [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <NewDisputeForm landlords={landlords as any} />
    </div>
  );
}
