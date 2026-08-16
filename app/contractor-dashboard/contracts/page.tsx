import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { resolveContractorAuth } from '@/lib/contractor-auth';

export default async function ContractsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractorAuth = await resolveContractorAuth(session.user.id);
  if (!contractorAuth) redirect('/onboarding/contractor');

  redirect('/contractor-dashboard/documents');
}
