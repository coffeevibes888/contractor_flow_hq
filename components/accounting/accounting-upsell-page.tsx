/**
 * AccountingUpsellPage — Full-page hard gate shown when a user's subscription
 * tier doesn't include the requested accounting feature.
 *
 * Renders a professional, benefit-focused upsell card (QuickBooks / Gusto style).
 * No data is fetched before this renders — the page.tsx gate fires first.
 *
 * Usage in page.tsx:
 *   const gate = await getAccountingGateStatus(landlord.id);
 *   if (!gate.canViewReports) {
 *     return <AccountingUpsellPage feature="profit-loss" currentTier={gate.tier} />;
 *   }
 */

import Link from 'next/link';
import { Crown, Lock, Check, ArrowRight, TrendingUp, BookOpen, FileText, Users, BarChart3, Receipt, Calculator, GitBranch, Shield, Clock, DollarSign, type LucideIcon } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/config/subscription-tiers';
import { SUBSCRIPTION_TIERS } from '@/lib/config/subscription-tiers';

// ─── Upsell content map — one entry per gated feature ─────────────────────

export type AccountingFeatureKey =
  | 'profit-loss'
  | 'balance-sheet'
  | 'trial-balance'
  | 'ar-aging'
  | 'cash-flow'
  | 'tenant-ledger'
  | 'owner-statements'
  | 'owners'
  | 'reconciliation'
  | 'journal'
  | 'chart-of-accounts'
  | 'vendors'
  | 'bills'
  | 'budget'
  | 'depreciation'
  | 'tax-summary'
  | 'audit-log'
  | 'periods';

interface UpsellContent {
  title: string;
  tagline: string;
  requiredTier: 'pro' | 'enterprise';
  icon: LucideIcon;
  bullets: string[];
}

export const ACCOUNTING_UPSELL_CONTENT: Record<AccountingFeatureKey, UpsellContent> = {
  'profit-loss': {
    title: 'Profit & Loss',
    tagline: 'See exactly how much you made — or lost — for any period.',
    requiredTier: 'pro',
    icon: TrendingUp,
    bullets: [
      'Monthly income vs expense breakdown by category',
      'Net income at a glance — no spreadsheet required',
      'Hand a clean P&L directly to your CPA at tax time',
      'Identify your highest-cost properties instantly',
    ],
  },
  'balance-sheet': {
    title: 'Balance Sheet',
    tagline: 'Know your true net worth as a landlord at any moment.',
    requiredTier: 'pro',
    icon: BookOpen,
    bullets: [
      'See exactly how much cash you hold vs. how much you owe',
      'Required by lenders when applying for a new mortgage',
      'Snapshot of assets, liabilities, and equity as of any date',
      'Proves financial health to partners and investors',
    ],
  },
  'trial-balance': {
    title: 'Trial Balance',
    tagline: 'Verify your books are mathematically perfect before tax season.',
    requiredTier: 'pro',
    icon: FileText,
    bullets: [
      'Every GL account with debit and credit totals',
      'Instant check: balanced books = nothing is missing',
      'Catch posting errors before they become tax problems',
      'Required for audit-ready books',
    ],
  },
  'ar-aging': {
    title: 'AR Aging Report',
    tagline: "See who owes you money and exactly how long it's been.",
    requiredTier: 'pro',
    icon: Clock,
    bullets: [
      '0–30 / 31–60 / 61–90 / 90+ day buckets per tenant',
      'Prioritize collections at a glance',
      'Export to CSV for your collections workflow',
      'Totals row shows your full receivables exposure',
    ],
  },
  'cash-flow': {
    title: 'Cash Flow Statement',
    tagline: 'The most important report your lender wants to see.',
    requiredTier: 'pro',
    icon: DollarSign,
    bullets: [
      'Operating, investing, and financing activity breakdown',
      'Shows whether your portfolio generates or consumes cash',
      'Required for SBA loans and private lender underwriting',
      'Reconciles to your beginning and ending cash balance',
    ],
  },
  'tenant-ledger': {
    title: 'Tenant Ledger',
    tagline: 'The complete financial history for every tenant.',
    requiredTier: 'pro',
    icon: Receipt,
    bullets: [
      'Every charge, payment, credit, and late fee — timestamped',
      'Running balance so you always know what a tenant owes',
      'Dispute-proof: receipts for every transaction',
      'Post manual credits, adjustments, and write-offs',
    ],
  },
  'owner-statements': {
    title: 'Owner Statements',
    tagline: 'Professional monthly distribution statements for your investors.',
    requiredTier: 'pro',
    icon: Users,
    bullets: [
      'Generate a polished statement for any owner in seconds',
      'Email directly to property owners with one click',
      'PDF export included — no spreadsheet required',
      'Shows income, expenses, management fee, and net distribution',
    ],
  },
  'owners': {
    title: 'Property Owners',
    tagline: 'Manage who owns what — and how to split the proceeds.',
    requiredTier: 'pro',
    icon: Users,
    bullets: [
      'Set ownership percentages per property',
      'Support for multiple co-owners on a single property',
      'Payout method per owner: ACH, check, or hold',
      'Ownership history tracked over time',
    ],
  },
  'reconciliation': {
    title: 'Bank Reconciliation',
    tagline: 'Match your Stripe and bank activity to your GL in minutes.',
    requiredTier: 'pro',
    icon: BarChart3,
    bullets: [
      'Auto-matching of Stripe charges to journal entries',
      'CSV import for any bank statement',
      'Catch unauthorized charges and duplicates automatically',
      'Audit-ready reconciliation history',
    ],
  },
  'journal': {
    title: 'Journal Entries',
    tagline: 'Post, view, and void any accounting entry directly.',
    requiredTier: 'enterprise',
    icon: GitBranch,
    bullets: [
      'Create manual adjustments, reclassifications, and corrections',
      'Full journal with every debit and credit posted to your GL',
      'Void and reverse entries with a complete audit trail',
      'Required for GAAP-compliant books',
    ],
  },
  'chart-of-accounts': {
    title: 'Chart of Accounts',
    tagline: 'Customize your GL accounts to match your business structure.',
    requiredTier: 'enterprise',
    icon: FileText,
    bullets: [
      'Add, rename, and deactivate accounts',
      'Custom accounts map to IRS Schedule E lines',
      'Sub-accounts for multi-property cost segregation',
      'System-seeded accounts always protected',
    ],
  },
  'vendors': {
    title: 'Vendor Management',
    tagline: 'Track every vendor you pay — from plumbers to lawyers.',
    requiredTier: 'enterprise',
    icon: Users,
    bullets: [
      'Vendor directory with contact info and default GL account',
      'Payment terms and 1099 tracking per vendor',
      'Contractor expenses automatically flow in',
      'Linked to AP Aging so you see everything owed in one place',
    ],
  },
  'bills': {
    title: 'Bills & Accounts Payable',
    tagline: 'Track every vendor bill from receipt to payment.',
    requiredTier: 'enterprise',
    icon: Receipt,
    bullets: [
      'Enter bills, approve them, and mark them paid',
      'AP Aging: know exactly what you owe and when it is due',
      'Contractor expenses bridge into one unified AP queue',
      'GL entry posts automatically on payment',
    ],
  },
  'budget': {
    title: 'Budget vs. Actual',
    tagline: 'Set a budget and see exactly where you stand — every month.',
    requiredTier: 'enterprise',
    icon: BarChart3,
    bullets: [
      'Monthly budget entry for every income and expense account',
      'Real-time variance: over/under budget per category',
      'Annual totals and 12-column monthly view',
      'Investor reporting: show budget variance at your next meeting',
    ],
  },
  'depreciation': {
    title: 'Depreciation Wizard',
    tagline: 'The single biggest tax benefit of owning real estate — automated.',
    requiredTier: 'enterprise',
    icon: Calculator,
    bullets: [
      'Straight-line depreciation calculated automatically per property',
      'Post monthly depreciation entries with one click',
      'Reduces your taxable income every year',
      'Accumulated depreciation tracked on your balance sheet',
    ],
  },
  'tax-summary': {
    title: 'Schedule E / Tax Summary',
    tagline: 'Hand your CPA exactly what they need — in one click.',
    requiredTier: 'enterprise',
    icon: FileText,
    bullets: [
      'GL balances mapped to IRS Schedule E line numbers',
      'Per-property columns so each property files separately',
      'Visual summary for you, detailed CSV export for your CPA',
      'Covers all 19 Schedule E expense categories',
    ],
  },
  'audit-log': {
    title: 'Audit Log',
    tagline: 'A complete record of every financial change — who, what, and when.',
    requiredTier: 'enterprise',
    icon: Shield,
    bullets: [
      'Timestamped history of every journal entry, bill approval, and statement',
      'Required for multi-owner LLCs and entities with outside investors',
      'SOC2-ready financial audit trail',
      'Filter by user, date range, or action type',
    ],
  },
  'periods': {
    title: 'Fiscal Period Management',
    tagline: 'Lock and close accounting periods to prevent unauthorized changes.',
    requiredTier: 'enterprise',
    icon: Lock,
    bullets: [
      'Open, lock, and permanently close fiscal months',
      'Prevents backdated entries into closed periods',
      'Required for multi-entity and investor-grade accounting',
      'Period status visible on every report',
    ],
  },
};

// ─── Component ─────────────────────────────────────────────────────────────

interface AccountingUpsellPageProps {
  feature: AccountingFeatureKey;
  currentTier: SubscriptionTier;
}

export default function AccountingUpsellPage({ feature, currentTier }: AccountingUpsellPageProps) {
  const content = ACCOUNTING_UPSELL_CONTENT[feature];
  const { requiredTier, title, tagline, bullets } = content;
  const FeatureIcon = content.icon;

  const tierConfig = SUBSCRIPTION_TIERS[requiredTier];
  const isPro = requiredTier === 'pro';

  // Gradient and colour palette: amber/orange for Pro, violet/purple for Enterprise
  const gradientClass = isPro
    ? 'from-amber-500 to-orange-500'
    : 'from-violet-600 to-purple-600';
  const iconBgClass = isPro
    ? 'bg-amber-100 text-amber-700'
    : 'bg-violet-100 text-violet-700';
  const badgeBgClass = isPro
    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
    : 'bg-gradient-to-r from-violet-600 to-purple-600';
  const buttonClass = isPro
    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white';
  const borderClass = isPro ? 'border-amber-200' : 'border-violet-200';
  const bgClass = isPro ? 'bg-amber-50/40' : 'bg-violet-50/40';

  const upgradeHref = `/admin/settings/subscription?upgrade=${requiredTier}`;
  const currentTierName = SUBSCRIPTION_TIERS[currentTier]?.name ?? 'Starter';

  return (
    <main className='w-full'>
      <div className='max-w-2xl mx-auto mt-8 sm:mt-16 px-4'>
        <div className={`rounded-2xl border ${borderClass} ${bgClass} overflow-hidden`}>
          {/* Header stripe */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${gradientClass}`} />

          <div className='p-8 sm:p-10'>
            {/* Icon + tier badge */}
            <div className='flex items-start justify-between mb-6'>
              <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconBgClass}`}>
                <FeatureIcon className='h-7 w-7' />
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white ${badgeBgClass}`}>
                <Crown className='h-3.5 w-3.5' />
                {tierConfig.name} Feature
              </div>
            </div>

            {/* Title + tagline */}
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>{title}</h1>
            <p className='mt-2 text-base text-gray-600 leading-relaxed'>{tagline}</p>

            {/* Current plan note */}
            <p className='mt-3 text-sm text-gray-500'>
              You&apos;re on the <span className='font-semibold text-gray-700 capitalize'>{currentTierName}</span> plan.
              {' '}{title} is available on <span className='font-semibold capitalize'>{tierConfig.name}</span> and above.
            </p>

            {/* Feature bullets */}
            <ul className='mt-6 space-y-3'>
              {bullets.map((bullet) => (
                <li key={bullet} className='flex items-start gap-3 text-sm text-gray-700'>
                  <Check className='h-4 w-4 shrink-0 mt-0.5 text-emerald-600' />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {/* Pricing callout */}
            <div className={`mt-8 rounded-xl border ${borderClass} p-4 flex items-center justify-between`}>
              <div>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>{tierConfig.name} Plan</p>
                <p className='text-sm text-gray-700 mt-0.5'>{tierConfig.description}</p>
              </div>
              <div className='text-right shrink-0 ml-4'>
                <span className='text-2xl font-bold text-gray-900'>${tierConfig.price}</span>
                <span className='text-sm text-gray-500'>/mo</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className='mt-6 flex flex-col sm:flex-row gap-3'>
              <Link
                href={upgradeHref}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${buttonClass}`}
              >
                <Crown className='h-4 w-4' />
                Upgrade to {tierConfig.name}
                <ArrowRight className='h-4 w-4' />
              </Link>
              <Link
                href='/admin/settings/subscription'
                className='inline-flex items-center justify-center gap-1 px-5 py-3 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors'
              >
                Compare all plans
              </Link>
            </div>

            {/* Back link */}
            <div className='mt-6 pt-5 border-t border-gray-100'>
              <Link
                href='/admin/accounting'
                className='text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1'
              >
                ← Back to Accounting
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
