import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { prisma } from '@/db/prisma';
import { Metadata } from 'next';
import Link from 'next/link';
import FeatureTracker from '@/components/analytics/feature-tracker';
import {
  Lock, BookOpen, PieChart, ListChecks, ScrollText, UsersRound, Users,
  ChevronRight, Crown, AlertCircle, Banknote, GitBranch, Receipt,
  BarChart3, Clock, DollarSign, Calculator, Shield, Settings2, FileText,
} from 'lucide-react';
import AccountingUpsellBanner from '@/components/accounting/accounting-upsell-banner';
import type { LucideIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Accounting' };

type AccessLevel = 'free' | 'pro' | 'enterprise';

interface ReportCard {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  plainEnglish: string;
  color: string;
  access: AccessLevel;
}

const reports: ReportCard[] = [
  // ── Available on all plans ────────────────────────────────────────────────
  {
    href: '/admin/accounting/rent-roll',
    icon: ScrollText,
    title: 'Rent Roll',
    desc: 'One row per unit: tenant, lease, market rent vs. actual, balance owed.',
    plainEnglish: 'Per-unit status: who is in, who owes, what they pay.',
    color: 'from-amber-500 to-orange-500',
    access: 'free',
  },
  // ── Pro plan ──────────────────────────────────────────────────────────────
  {
    href: '/admin/accounting/profit-loss',
    icon: PieChart,
    title: 'Profit & Loss',
    desc: 'Money in vs. money out for a period. The bottom line is what you actually kept.',
    plainEnglish: 'Did I make or lose money this month?',
    color: 'from-emerald-500 to-teal-500',
    access: 'pro',
  },
  {
    href: '/admin/accounting/balance-sheet',
    icon: BookOpen,
    title: 'Balance Sheet',
    desc: 'What you own, what you owe, and your net worth — as of a date you pick.',
    plainEnglish: 'How much am I actually worth?',
    color: 'from-violet-500 to-purple-500',
    access: 'pro',
  },
  {
    href: '/admin/accounting/trial-balance',
    icon: ListChecks,
    title: 'Trial Balance',
    desc: 'A list of every account in your books with its running balance.',
    plainEnglish: 'Sanity check: do my books add up?',
    color: 'from-sky-500 to-cyan-500',
    access: 'pro',
  },
  {
    href: '/admin/accounting/tenant-ledger',
    icon: Receipt,
    title: 'Tenant Ledger',
    desc: 'Complete charge and payment history per tenant with running balance.',
    plainEnglish: 'What does each tenant owe — and what did they pay?',
    color: 'from-rose-500 to-pink-500',
    access: 'pro',
  },
  {
    href: '/admin/accounting/owner-statements',
    icon: UsersRound,
    title: 'Owner Statements',
    desc: 'Generate and email monthly distribution statements to your property owners.',
    plainEnglish: 'Send a report to an owner with their share.',
    color: 'from-rose-500 to-pink-500',
    access: 'pro',
  },
  {
    href: '/admin/accounting/owners',
    icon: Users,
    title: 'Property Owners',
    desc: 'Manage owners, contact info, and what % of each property they own.',
    plainEnglish: 'Who owns what — and how to split the rent.',
    color: 'from-pink-500 to-rose-500',
    access: 'pro',
  },
  {
    href: '/admin/accounting/reconciliation',
    icon: Banknote,
    title: 'Bank Reconciliation',
    desc: 'Match your Stripe and bank CSV activity to your GL.',
    plainEnglish: 'Are my bank records and my books in sync?',
    color: 'from-teal-500 to-cyan-500',
    access: 'pro',
  },
  {
    href: '/admin/accounting/ar-aging',
    icon: Clock,
    title: 'AR Aging',
    desc: 'Who owes you money, bucketed by how many days overdue.',
    plainEnglish: 'Who is behind on rent — and by how long?',
    color: 'from-orange-500 to-amber-500',
    access: 'pro',
  },
  {
    href: '/admin/accounting/cash-flow',
    icon: DollarSign,
    title: 'Cash Flow Statement',
    desc: 'Operating, investing, and financing activity — all three cash-flow buckets.',
    plainEnglish: 'Is my portfolio generating or consuming cash?',
    color: 'from-green-500 to-emerald-500',
    access: 'pro',
  },
  // ── Enterprise plan ───────────────────────────────────────────────────────
  {
    href: '/admin/accounting/journal',
    icon: GitBranch,
    title: 'Journal Entries',
    desc: 'View, post, and void any entry in the general ledger.',
    plainEnglish: 'Post manual adjustments and corrections to the books.',
    color: 'from-indigo-500 to-blue-500',
    access: 'enterprise',
  },
  {
    href: '/admin/accounting/chart-of-accounts',
    icon: ListChecks,
    title: 'Chart of Accounts',
    desc: 'View and customize your GL accounts, sub-types, and tax line mappings.',
    plainEnglish: 'What accounts make up my books?',
    color: 'from-slate-500 to-gray-500',
    access: 'enterprise',
  },
  {
    href: '/admin/accounting/bills',
    icon: FileText,
    title: 'Bills & AP',
    desc: 'Vendor bills from draft to payment — with AP Aging built in.',
    plainEnglish: 'What do I owe vendors — and when is it due?',
    color: 'from-red-500 to-rose-500',
    access: 'enterprise',
  },
  {
    href: '/admin/accounting/budget',
    icon: BarChart3,
    title: 'Budget vs. Actual',
    desc: 'Set monthly budgets per GL account and track variance in real time.',
    plainEnglish: 'Am I on budget this month?',
    color: 'from-cyan-500 to-sky-500',
    access: 'enterprise',
  },
  {
    href: '/admin/accounting/depreciation',
    icon: Calculator,
    title: 'Depreciation',
    desc: 'Calculate and post straight-line depreciation for each property.',
    plainEnglish: 'Am I taking my biggest tax deduction every month?',
    color: 'from-lime-500 to-green-500',
    access: 'enterprise',
  },
  {
    href: '/admin/accounting/tax-summary',
    icon: FileText,
    title: 'Schedule E / Tax Summary',
    desc: 'GL balances mapped to IRS Schedule E lines — one click for your CPA.',
    plainEnglish: 'What do I hand my accountant at tax time?',
    color: 'from-blue-500 to-indigo-500',
    access: 'enterprise',
  },
  {
    href: '/admin/accounting/audit-log',
    icon: Shield,
    title: 'Audit Log',
    desc: 'Every financial change — who did it, when, and what changed.',
    plainEnglish: 'Who changed what in the books?',
    color: 'from-gray-500 to-slate-600',
    access: 'enterprise',
  },
  {
    href: '/admin/accounting/periods',
    icon: Settings2,
    title: 'Fiscal Periods',
    desc: 'Open, lock, and close accounting periods to protect finalized data.',
    plainEnglish: 'Lock last month so nothing can be changed.',
    color: 'from-zinc-500 to-stone-500',
    access: 'enterprise',
  },
];

// Map access level → whether the user's gate allows it
function isUnlocked(access: AccessLevel, canViewReports: boolean, canViewLedger: boolean, canManage: boolean): boolean {
  if (access === 'free') return true;
  if (access === 'pro') return canViewReports || canViewLedger;
  if (access === 'enterprise') return canManage;
  return false;
}

const AccountingPage = async () => {
  await requireAdmin();
  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success) throw new Error(landlordResult.message ?? 'Unable to determine landlord');
  const landlord = landlordResult.landlord;

  const userRole = await getCurrentUserTeamRole(landlord.id);
  const canView = userRole.isOwner || (userRole.permissions as string[]).includes('view_financials');
  if (!canView) {
    return (
      <main className='w-full px-4 py-10'>
        <div className='max-w-lg mx-auto text-center space-y-4'>
          <div className='mx-auto w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-red-400' />
          </div>
          <h1 className='text-xl font-semibold text-black'>Access Restricted</h1>
          <p className='text-gray-500 text-sm'>Your role does not have permission to view financial reports.</p>
        </div>
      </main>
    );
  }

  const gate = await getAccountingGateStatus(landlord.id);
  const { tier, canViewReports, canViewLedger, canManage } = gate;

  // Quick stats — only fetch counts the user can access
  const [journalCount, ledgerCount, statementCount, ownerCount] = await Promise.all([
    canManage
      ? prisma.journalEntry.count({ where: { landlordId: landlord.id } })
      : Promise.resolve(null),
    canViewLedger
      ? prisma.tenantLedgerEntry.count({ where: { landlordId: landlord.id } })
      : Promise.resolve(null),
    canViewLedger
      ? prisma.ownerStatement.count({ where: { landlordId: landlord.id } })
      : Promise.resolve(null),
    canViewLedger
      ? prisma.owner.count({ where: { landlordId: landlord.id, isActive: true } })
      : Promise.resolve(null),
  ]);

  return (
    <main className='w-full'>
      <FeatureTracker step="accounting_viewed" metadata={{ tier }} />
      <div className='max-w-7xl space-y-6'>

        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3'>
          <div>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Accounting</h1>
            <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
              The books behind your properties — what came in, what went out, and who gets what.
            </p>
          </div>
          <Link
            href='/admin/university/article/accounting-101'
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-xs font-medium text-sky-700 hover:bg-sky-100'
          >
            <BookOpen className='h-3.5 w-3.5' />
            New to accounting? Start here →
          </Link>
        </div>

        {/* Upsell banners — always visible so users know what's above them */}
        {tier === 'starter' && (
          <AccountingUpsellBanner
            currentTier='starter'
            message='Unlock P&L, Balance Sheet, Tenant Ledger, Owner Statements, AR Aging, and more.'
            upgradeHref='/admin/settings/subscription?upgrade=pro'
            upgradeLabel='Upgrade to Pro — $99/mo'
          />
        )}
        {tier === 'pro' && (
          <AccountingUpsellBanner
            currentTier='pro'
            message='Unlock Journal Entries, AP/Bills, Budget vs Actual, Depreciation, Tax Summary, and more.'
            upgradeHref='/admin/settings/subscription?upgrade=enterprise'
            upgradeLabel='Upgrade to Enterprise — $199/mo'
          />
        )}

        {/* Quick stats — respect tier access */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
          <Stat
            label='Journal Entries'
            value={journalCount}
            hint='Double-entry posts in your GL'
            locked={!canManage}
            lockedTier='enterprise'
          />
          <Stat
            label='Tenant Ledger Entries'
            value={ledgerCount}
            hint='Per-tenant charges, payments, deposits'
            locked={!canViewLedger}
            lockedTier='pro'
          />
          <Stat
            label='Owner Statements'
            value={statementCount}
            hint='Monthly distribution statements'
            locked={!canViewLedger}
            lockedTier='pro'
          />
          <Stat
            label='Active Owners'
            value={ownerCount}
            hint='Property owners you distribute to'
            locked={!canViewLedger}
            lockedTier='pro'
          />
        </div>

        <div className='text-xs text-gray-500 inline-flex items-center gap-1'>
          <AlertCircle className='h-3 w-3' />
          Current plan: <strong className='text-gray-700 capitalize'>{tier}</strong>
        </div>

        {/* Report cards grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {reports.map((r) => {
            const unlocked = isUnlocked(r.access, canViewReports, canViewLedger, canManage);
            const Icon = r.icon;
            const badgeLabel = r.access === 'enterprise' ? 'Enterprise' : r.access === 'pro' ? 'Pro' : null;
            const badgeColor = r.access === 'enterprise'
              ? 'from-violet-500 to-purple-500'
              : 'from-amber-500 to-orange-500';

            if (unlocked) {
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  className='group relative block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all hover:border-gray-300'
                >
                  <div className={`inline-flex w-10 h-10 rounded-lg bg-gradient-to-br ${r.color} items-center justify-center mb-3`}>
                    <Icon className='h-5 w-5 text-white' />
                  </div>
                  <h2 className='text-base font-semibold text-gray-900 group-hover:text-sky-600 transition-colors flex items-center gap-1'>
                    {r.title}
                    <ChevronRight className='h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity' />
                  </h2>
                  <p className='text-sm text-gray-700 italic mt-1'>&ldquo;{r.plainEnglish}&rdquo;</p>
                  <p className='text-xs text-gray-500 mt-1.5'>{r.desc}</p>
                </Link>
              );
            }

            // Locked card — clicking sends to feature's upsell page
            const upsellHref = `${r.href}`;
            return (
              <Link
                key={r.href}
                href={upsellHref}
                className='group relative block bg-gray-50 border border-gray-200 rounded-xl p-5 opacity-75 hover:opacity-100 hover:shadow-sm transition-all cursor-pointer'
              >
                {/* Lock overlay badge */}
                {badgeLabel && (
                  <span className={`absolute top-3 right-3 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r ${badgeColor} text-white uppercase tracking-wide`}>
                    <Crown className='h-2 w-2' /> {badgeLabel}
                  </span>
                )}
                <div className={`inline-flex w-10 h-10 rounded-lg bg-gradient-to-br ${r.color} items-center justify-center mb-3 opacity-50`}>
                  <Icon className='h-5 w-5 text-white' />
                </div>
                <h2 className='text-base font-semibold text-gray-500 flex items-center gap-1.5'>
                  <Lock className='h-3.5 w-3.5 text-gray-400' />
                  {r.title}
                </h2>
                <p className='text-sm text-gray-400 italic mt-1'>&ldquo;{r.plainEnglish}&rdquo;</p>
                <p className='text-xs text-gray-400 mt-1.5'>{r.desc}</p>
                <p className={`mt-3 text-xs font-medium bg-gradient-to-r ${badgeColor} bg-clip-text text-transparent`}>
                  Unlock with {badgeLabel} →
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
};

function Stat({
  label,
  value,
  hint,
  locked,
  lockedTier,
}: {
  label: string;
  value: number | null;
  hint: string;
  locked: boolean;
  lockedTier: 'pro' | 'enterprise';
}) {
  const badgeColor = lockedTier === 'enterprise'
    ? 'from-violet-500 to-purple-500'
    : 'from-amber-500 to-orange-500';

  return (
    <div className='bg-white border border-gray-200 rounded-lg p-4 relative'>
      <p className='text-xs text-gray-500 uppercase tracking-wide'>{label}</p>
      {locked ? (
        <div className='mt-1 flex items-center gap-1.5'>
          <Lock className='h-4 w-4 text-gray-300' />
          <span className={`text-xs font-semibold bg-gradient-to-r ${badgeColor} bg-clip-text text-transparent capitalize`}>
            {lockedTier} only
          </span>
        </div>
      ) : (
        <p className='text-2xl font-bold mt-1'>{(value ?? 0).toLocaleString()}</p>
      )}
      <p className='text-[11px] text-gray-500 mt-0.5'>{hint}</p>
    </div>
  );
}

export default AccountingPage;
