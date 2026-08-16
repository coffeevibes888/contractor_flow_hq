import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Metadata } from 'next';
import BillingClient from './billing-client';

export const metadata: Metadata = {
  title: 'Billing | Property Flow HQ',
  description: 'Manage your subscription and billing',
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const params = await searchParams;

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
    select: {
      id: true,
      trialStartDate: true,
      trialEndDate: true,
      trialStatus: true,
      stripeSubscriptionId: true,
      stripeCustomerId: true,
      subscriptionStatus: true,
      subscription: {
        select: {
          tier: true,
          status: true,
          stripeSubscriptionId: true,
          currentPeriodEnd: true,
        },
      },
      _count: { select: { properties: true } },
      // Grab the first property name to personalise the trial-ended headline
      properties: {
        select: { name: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  if (!landlord) redirect('/onboarding');

  // If already subscribed, show current plan info instead of the picker
  const hasPaidPlan =
    !!landlord.stripeSubscriptionId ||
    !!landlord.subscription?.stripeSubscriptionId ||
    landlord.subscriptionStatus === 'active' ||
    landlord.subscription?.status === 'active';

  // Compute days remaining in trial
  const now = new Date();
  const msLeft = landlord.trialEndDate
    ? landlord.trialEndDate.getTime() - now.getTime()
    : 0;
  const daysLeft = landlord.trialEndDate
    ? Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <BillingClient
      userName={session.user.name || 'there'}
      hasPaidPlan={hasPaidPlan}
      daysLeft={daysLeft}
      trialEndDate={landlord.trialEndDate?.toISOString() ?? null}
      currentTier={landlord.subscription?.tier ?? null}
      reason={params.reason ?? null}
      canceledCheckout={params.canceled === 'true'}
      propertiesCount={landlord._count.properties}
      firstPropertyName={landlord.properties?.[0]?.name ?? null}
    />
  );
}
