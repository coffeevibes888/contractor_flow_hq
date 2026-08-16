import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getCurrentLandlordSubscription } from '@/lib/actions/subscription.actions';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getYtdEarningsForLandlord } from '@/lib/services/payroll.service';
import { PayrollPageWrapper } from '@/components/admin/team-pages/payroll-page';
import { TreasuryPayrollPanel } from '@/components/admin/payroll/treasury-payroll-panel';
import { PayrollLockedCard } from '@/components/admin/payroll/payroll-locked-card';

export const metadata: Metadata = {
  title: 'Payroll',
};

export default async function PayrollPage() {
  await requireAdmin();

  const subscriptionData = await getCurrentLandlordSubscription();
  const tier = (subscriptionData.success
    ? subscriptionData.currentTier
    : 'starter') as 'starter' | 'pro' | 'enterprise';

  // Starter: hard lock — show the locked card with upgrade CTA.
  if (tier === 'starter') {
    return (
      <main className='w-full px-4 py-10 md:px-0'>
        <div className='max-w-3xl mx-auto'>
          <PayrollLockedCard currentTier='starter' />
        </div>
      </main>
    );
  }

  // Pro + Enterprise: render the Treasury panel.
  // Server-fetch the lists the panel needs so it can hydrate immediately.
  const session = await auth();
  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord || !session?.user?.id) {
    return (
      <main className='w-full px-4 py-10 md:px-0'>
        <div className='max-w-3xl mx-auto'>
          <PayrollLockedCard currentTier={tier} />
        </div>
      </main>
    );
  }
  const landlordId = landlordResult.landlord.id;

  // Approved unpaid timesheets — the "Pay Now" worklist.
  const approvedTs = await prisma.timesheet.findMany({
    where: {
      landlordId,
      status: 'approved',
      payment: null,
    },
    orderBy: { periodEnd: 'desc' },
    take: 50,
    include: {
      teamMember: {
        select: {
          id: true,
          hourlyRate: true,
          user: { select: { name: true } },
          invitedEmail: true,
          compensation: {
            select: {
              treasuryOnboardingStatus: true,
              treasuryEnabled: true,
            },
          },
        },
      },
    },
  });

  const approvedTimesheets = approvedTs.map((ts) => ({
    id: ts.id,
    teamMemberId: ts.teamMemberId,
    teamMemberName:
      ts.teamMember.user?.name || ts.teamMember.invitedEmail || 'Team member',
    periodStart: ts.periodStart.toISOString(),
    periodEnd: ts.periodEnd.toISOString(),
    totalHours: Number(ts.totalHours),
    hourlyRate: Number(ts.teamMember.hourlyRate ?? 0),
    walletReady:
      ts.teamMember.compensation?.treasuryOnboardingStatus === 'verified' &&
      ts.teamMember.compensation?.treasuryEnabled === true,
  }));

  // Team member roster + treasury status for the settings tab.
  const tmRows = await prisma.teamMember.findMany({
    where: { landlordId, status: { in: ['pending', 'active'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      hourlyRate: true,
      paySchedule: true,
      paySchedulePayDate: true,
      user: { select: { name: true, email: true } },
      invitedEmail: true,
      compensation: {
        select: {
          treasuryOnboardingStatus: true,
          treasuryEnabled: true,
        },
      },
    },
  });

  const teamMembers = tmRows.map((t) => ({
    id: t.id,
    name: t.user?.name || t.invitedEmail || 'Team member',
    hourlyRate: t.hourlyRate ? Number(t.hourlyRate) : null,
    paySchedule: t.paySchedule,
    paySchedulePayDate: t.paySchedulePayDate?.toISOString() ?? null,
    treasuryOnboardingStatus: t.compensation?.treasuryOnboardingStatus ?? null,
    treasuryEnabled: t.compensation?.treasuryEnabled ?? false,
  }));

  // YTD earnings map for the 1099 badge.
  const ytdMap = await getYtdEarningsForLandlord(landlordId);
  const ytdByMember: Record<string, number> = {};
  ytdMap.forEach((v, k) => {
    ytdByMember[k] = v;
  });

  return (
    <main className='w-full pb-8 space-y-6'>
      <div className='px-4 md:px-0'>
        <h1 className='text-2xl font-bold text-slate-900'>Payroll</h1>
        <p className='text-sm text-slate-600 mt-1'>
          Pay 1099 team members directly from your Treasury Wallet. $1 fee
          per payment, no withholding. Stripe handles 1099-NEC at year end.
        </p>
      </div>

      <div className='px-4 md:px-0'>
        <TreasuryPayrollPanel
          approvedTimesheets={approvedTimesheets}
          teamMembers={teamMembers}
          ytdByMember={ytdByMember}
        />
      </div>

      {/* Legacy payroll wrapper (bonus payments + adjustments). Untouched —
          coexists with the new Treasury panel above. */}
      <div className='px-4 md:px-0 pt-4 border-t border-slate-200'>
        <PayrollPageWrapper />
      </div>
    </main>
  );
}
