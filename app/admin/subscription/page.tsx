import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { getCurrentLandlordSubscription } from '@/lib/actions/subscription.actions';
import { SubscriptionDashboard } from './subscription-dashboard';

export const metadata: Metadata = {
  title: 'Subscription | Property Flow HQ',
  description: 'Manage your plan, upgrade, or view your trial status',
};

export default async function AdminSubscriptionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  // Load subscription data + trial state in one pass
  const [subscriptionData, landlord] = await Promise.all([
    getCurrentLandlordSubscription(),
    prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
      select: {
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
            cancelAtPeriodEnd: true,
          },
        },
      },
    }),
  ]);

  // Compute trial days remaining
  const now = new Date();
  const msLeft = landlord?.trialEndDate ? landlord.trialEndDate.getTime() - now.getTime() : 0;
  const trialDaysLeft = landlord?.trialEndDate ? Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))) : 0;

  const hasPaidPlan =
    !!landlord?.stripeSubscriptionId ||
    !!landlord?.subscription?.stripeSubscriptionId ||
    landlord?.subscriptionStatus === 'active' ||
    landlord?.subscription?.status === 'active';

  return (
    <main className='w-full px-0 py-6 md:py-8'>
      <div className='max-w-5xl mx-auto space-y-2 px-2'>
        {subscriptionData.success && subscriptionData.currentTier && subscriptionData.tierConfig ? (
          <SubscriptionDashboard
            currentTier={subscriptionData.currentTier}
            tierConfig={subscriptionData.tierConfig}
            unitCount={subscriptionData.unitCount ?? 0}
            unitLimit={subscriptionData.unitLimit ?? 24}
            nearLimit={subscriptionData.nearLimit ?? false}
            atLimit={subscriptionData.atLimit ?? false}
            features={subscriptionData.features!}
            cancelAtPeriodEnd={subscriptionData.subscription?.cancelAtPeriodEnd ?? false}
            currentPeriodEnd={subscriptionData.subscription?.currentPeriodEnd ?? null}
            trialDaysLeft={trialDaysLeft}
            hasPaidPlan={hasPaidPlan}
          />
        ) : (
          <div className='rounded-xl border border-red-500/30 bg-red-500/10 p-6'>
            <p className='text-red-400'>{subscriptionData.message || 'Unable to load subscription data'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
