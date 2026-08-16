import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import TeamOperationsPage from '@/components/admin/team-operations-page';
import { FeatureGate } from '@/components/feature-gate';

export const metadata = {
  title: 'Team Operations | Admin',
  description: 'Manage scheduling, time tracking, timesheets, payroll, and hiring',
};

export default async function TeamOperationsAdminPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Check if user is a landlord with enterprise subscription
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
    select: { id: true, subscriptionTier: true },
  });

  if (!landlord) {
    redirect('/admin');
  }

  return (
    <FeatureGate 
      landlordId={landlord.id}
      feature="shiftScheduling" 
      featureName="Team Operations"
    >
      <TeamOperationsPage />
    </FeatureGate>
  );
}
