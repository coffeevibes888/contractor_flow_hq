import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import OnboardingClient from './onboarding-client';

export const metadata: Metadata = {
  title: 'Getting started',
};

const AdminOnboardingPage = async () => {
  await requireAdmin();
  const session = await auth();
  const landlordResult = await getOrCreateCurrentLandlord();

  const firstName = session?.user?.name
    ? session.user.name.split(' ')[0]
    : 'there';

  const landlordId = landlordResult.success ? landlordResult.landlord.id : null;
  const hasStripeConnect = landlordResult.success
    ? Boolean(landlordResult.landlord.stripeConnectAccountId)
    : false;

  // Check if they signed up via the free lease builder — they likely already have tenants.
  // FreeLeaseUsage is keyed by email and marked converted=true when the user created an account.
  const userEmail = session?.user?.email;
  const hasLeaseDocuments = userEmail
    ? (await prisma.freeLeaseUsage.count({
        where: { email: userEmail, converted: true },
      }).catch(() => 0)) > 0
    : false;

  // Days left in trial for early-upgrade offer
  let trialDaysLeft = 14;
  if (landlordId) {
    const landlordRow = await prisma.landlord.findUnique({
      where: { id: landlordId },
      select: { trialEndDate: true, stripeSubscriptionId: true, subscriptionStatus: true },
    });
    if (landlordRow?.trialEndDate) {
      const ms = landlordRow.trialEndDate.getTime() - Date.now();
      trialDaysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }
    const hasPaid =
      !!landlordRow?.stripeSubscriptionId ||
      landlordRow?.subscriptionStatus === 'active';
    if (hasPaid) trialDaysLeft = -1; // signal: already paying
  }

  return (
    <OnboardingClient
      firstName={firstName}
      hasLeaseDocuments={hasLeaseDocuments}
      hasStripeConnect={hasStripeConnect}
      trialDaysLeft={trialDaysLeft}
    />
  );
};

export default AdminOnboardingPage;
