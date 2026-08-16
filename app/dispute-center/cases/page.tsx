import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDisputes } from '@/lib/actions/dispute.actions';
import { convertToPlainObject } from '@/lib/utils';
import AllCasesView from './all-cases-view';

export const metadata: Metadata = {
  title: 'All Cases | Dispute Center',
};

export default async function AllCasesPage() {
  const session = await auth();

  if (!session) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
    return redirect('/unauthorized');
  }

  const disputesResult = await getDisputes();
  const disputes = disputesResult.success ? convertToPlainObject(disputesResult.disputes) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AllCasesView disputes={disputes as any} />
    </div>
  );
}
