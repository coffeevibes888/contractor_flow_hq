import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import ContractorSubscriptionClient from './contractor-subscription-client';
import { ensureRoleForContext } from '@/lib/actions/role-assignment';

export const metadata: Metadata = {
  title: 'Choose Your Plan | RentFlowHQ',
  description: 'Select the perfect plan for your contracting business',
};

export default async function ContractorSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; canceled?: string; subscription?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const canceledCheckout = params.canceled === 'true';
  const subscriptionSuccess = params.subscription === 'success';

  // Defensive: any user landing on the contractor plan picker is intended
  // to be a contractor. This call is idempotent — if the user is already
  // correctly set up, it does nothing. If they're mis-roled or missing a
  // ContractorProfile / trial dates, it fixes everything in one shot. This
  // is the backstop that prevents the signup-to-dashboard redirect loop,
  // regardless of which sign-up entry path got them here.
  await ensureRoleForContext('contractor');

  // If already has active subscription / in trial, go straight to dashboard
  if (!canceledCheckout) {
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        trialStatus: true,
      },
    });

    if (profile) {
      // Only skip subscription page if user has a PAID subscription (active with Stripe)
      // or has already completed checkout. Trialing users should still see the plan
      // selection page so they can choose their tier before the trial starts.
      const hasActiveSubscription =
        !!profile.stripeSubscriptionId || 
        profile.subscriptionStatus === 'active';

      if (hasActiveSubscription) {
        redirect('/contractor-dashboard');
      }

      // If subscription just completed checkout, also redirect
      if (subscriptionSuccess && profile.stripeSubscriptionId) {
        redirect('/contractor-dashboard');
      }
    }
  }

  return <ContractorSubscriptionClient userName={session.user.name || 'there'} />;
}
