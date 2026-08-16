import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getContractorIdForUser } from '@/lib/contractor-profile';
import ContractorMessagesClient from './messages-client';

export default async function ContractorMessagesPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Verify user is a contractor
  const contractorId = await getContractorIdForUser(session.user.id);
  if (!contractorId) {
    redirect('/contractor-dashboard');
  }

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Messages</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Communicate with clients, property managers, and homeowners.
        </p>
      </div>

      <ContractorMessagesClient 
        userId={session.user.id}
        userName={session.user.name || 'Contractor'}
        userEmail={session.user.email || ''}
      />
    </div>
  );
}
