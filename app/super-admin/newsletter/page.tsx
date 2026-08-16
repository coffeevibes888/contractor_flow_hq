import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import SignupsCrmClient from './newsletter-client';

export const metadata = {
  title: 'Signups CRM | Super Admin',
  description: 'Track every landlord signup, their activation progress, and emails sent',
};

export default async function SignupsCrmPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'superAdmin') {
    redirect('/unauthorized');
  }

  const now        = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── All landlords + their activation data ──────────────────────────────
  const landlords = await prisma.landlord.findMany({
    where: { ownerUserId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id:                    true,
      name:                  true,
      createdAt:             true,
      subscriptionStatus:    true,
      subscriptionTier:      true,
      trialEndDate:          true,
      trialRemindersSent:    true,
      stripeConnectAccountId:true,
      stripeSubscriptionId:  true,
      ownerUserId:           true,
      owner: {
        select: { email: true, name: true },
      },
      _count: {
        select: {
          properties: true,
          tenantLinks: true,
        },
      },
    },
  });

  // ── Email events — index by recipientEmail for fast lookup ─────────────
  const allEmails = landlords
    .map((l) => l.owner?.email)
    .filter(Boolean) as string[];

  const emailEvents = allEmails.length
    ? await (prisma as any).emailEvent.findMany({
        where: { recipientEmail: { in: allEmails } },
        select: {
          recipientEmail: true,
          emailType:      true,
          eventType:      true,
          createdAt:      true,
        },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  // Group events by email address
  const eventsByEmail: Record<
    string,
    { emailType: string | null; eventType: string; createdAt: Date }[]
  > = {};
  for (const ev of emailEvents) {
    const key = ev.recipientEmail.toLowerCase();
    if (!eventsByEmail[key]) eventsByEmail[key] = [];
    eventsByEmail[key].push(ev);
  }

  // ── KPI totals ──────────────────────────────────────────────────────────
  const [
    totalLandlords,
    activeSubscriptions,
    trialingCount,
    signupsThisMonth,
  ] = await Promise.all([
    prisma.landlord.count({ where: { ownerUserId: { not: null } } }),
    prisma.landlord.count({ where: { subscriptionStatus: 'active' } }),
    prisma.landlord.count({ where: { subscriptionStatus: 'trialing' } }),
    prisma.landlord.count({
      where: {
        ownerUserId: { not: null },
        createdAt:   { gte: thirtyDaysAgo },
      },
    }),
  ]);

  // ── Serialize for client component ─────────────────────────────────────
  const rows = landlords.map((l) => {
    const email      = l.owner?.email?.toLowerCase() ?? '';
    const events     = eventsByEmail[email] ?? [];
    const sentTypes  = new Set(events.filter((e) => e.eventType === 'email.sent').map((e)   => e.emailType ?? ''));
    const openedTypes= new Set(events.filter((e) => e.eventType === 'email.opened').map((e) => e.emailType ?? ''));
    const hasPaid    = !!l.stripeSubscriptionId || l.subscriptionStatus === 'active';
    const daysLeft   = l.trialEndDate
      ? Math.max(0, Math.ceil((l.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
    const reminders  = (l.trialRemindersSent ?? {}) as Record<string, boolean>;

    return {
      id:              l.id,
      name:            l.owner?.name ?? l.name,
      email:           l.owner?.email ?? '',
      createdAt:       l.createdAt.toISOString(),
      propertiesCount: l._count.properties,
      tenantsCount:    l._count.tenantLinks,
      subscriptionStatus: l.subscriptionStatus,
      subscriptionTier:   l.subscriptionTier,
      hasPaid,
      daysLeft,
      hasBankConnected: !!l.stripeConnectAccountId,
      // Which lifecycle emails were queued (from trialRemindersSent JSON)
      sentDay1:  !!reminders['day1_explainer'],
      sentDay2:  !!reminders['day2_no_property'],
      sentDay7:  !!reminders['day7_no_stripe'],
      // Which were actually opened (from EmailEvent table)
      openedDay1:  openedTypes.has('day1_explainer'),
      openedDay2:  openedTypes.has('day2_no_property'),
      openedDay7:  openedTypes.has('day7_no_stripe'),
      // Any bounce/complaint
      bounced:   events.some((e) => e.eventType === 'email.bounced'),
      complained:events.some((e) => e.eventType === 'email.complained'),
    };
  });

  return (
    <div className='container mx-auto py-8 px-4'>
      <SignupsCrmClient
        rows={rows}
        stats={{
          total:       totalLandlords,
          active:      activeSubscriptions,
          trialing:    trialingCount,
          thisMonth:   signupsThisMonth,
        }}
      />
    </div>
  );
}
