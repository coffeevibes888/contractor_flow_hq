import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getMyDisputes } from '@/lib/actions/dispute.actions';
import { convertToPlainObject } from '@/lib/utils';
import ContractorDisputesView from './contractor-disputes-view';

export const metadata = {
  title: 'Disputes | Contractor Portal',
};

export default async function ContractorDisputesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'contractor') {
    return redirect('/');
  }

  const disputesResult = await getMyDisputes();
  const disputes = disputesResult.success ? convertToPlainObject(disputesResult.disputes) : [];

  return <ContractorDisputesView disputes={disputes as any} />;
}
