import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';

/**
 * Server component rendered inside the admin layout.
 * Shows a countdown banner for landlords on a no-card free trial.
 * Hidden once they have an active Stripe subscription.
 *
 * No cron job needed — days remaining are computed on every request
 * from the trialEndDate stored at signup time.
 */
export async function TrialBanner() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
    select: {
      trialStartDate: true,
      trialEndDate: true,
      trialStatus: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      subscription: { select: { stripeSubscriptionId: true, status: true } },
    },
  });

  if (!landlord) return null;

  // Hide banner once they have a real Stripe subscription
  const hasPaidPlan =
    !!landlord.stripeSubscriptionId ||
    !!landlord.subscription?.stripeSubscriptionId ||
    landlord.subscriptionStatus === 'active' ||
    landlord.subscription?.status === 'active';

  if (hasPaidPlan) return null;

  // Hide if trial was never started (shouldn't happen for new signups)
  if (!landlord.trialEndDate || !landlord.trialStartDate) return null;

  const now = new Date();
  const msLeft = landlord.trialEndDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  // Trial already expired — gate handles redirect, banner not needed
  if (daysLeft <= 0) return null;

  // Only show the banner when 5 or fewer days remain — avoid spamming
  // users who just signed up and have 14 days ahead of them.
  if (daysLeft > 5) return null;

  // Choose urgency level
  const isUrgent = daysLeft <= 2;
  const isWarning = daysLeft <= 4;

  const bgClass = isUrgent
    ? 'bg-red-50 border-red-200 text-red-800'
    : isWarning
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-blue-50 border-blue-200 text-blue-800';

  const dotClass = isUrgent
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-blue-500';

  const label =
    daysLeft === 1
      ? 'Your free trial ends tomorrow.'
      : `Your free trial ends in ${daysLeft} days.`;

  return (
    <div className={`w-full border-b px-4 py-2.5 ${bgClass}`}>
      <div className='mx-auto max-w-7xl flex items-center justify-between gap-4'>
        <div className='flex items-center gap-2.5 text-sm font-medium'>
          {/* Pulsing dot */}
          <span className='relative flex h-2 w-2 shrink-0'>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
          </span>
          <span>{label}</span>
          <span className='hidden sm:inline opacity-70'>Add a card to keep access after your trial.</span>
        </div>
        <Link
          href='/admin/billing'
          className='shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white border border-current/20 px-3 py-1 text-xs font-semibold shadow-sm hover:bg-white/80 transition-colors'
        >
          <CreditCard className='h-3.5 w-3.5' />
          Add card
        </Link>
      </div>
    </div>
  );
}
