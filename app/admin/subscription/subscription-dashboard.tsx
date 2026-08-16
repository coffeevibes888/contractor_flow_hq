'use client';

import { useState } from 'react';
import {
  Check, Zap, Building2, Bell, DollarSign, Users, MessageSquare, Briefcase,
  Crown, Settings, XCircle, Palette, Code, Webhook, BookOpen, LineChart,
  Calculator, Receipt, ArrowRight, Lock, ShieldCheck, CreditCard, BadgeCheck,
  AlertCircle, Clock, Sparkles, TrendingUp, CheckCircle2,
} from 'lucide-react';
import {
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  TierFeatures,
  YEARLY_DISCOUNT_PERCENT,
  getYearlyPrice,
} from '@/lib/config/subscription-tiers';

interface SubscriptionDashboardProps {
  currentTier: SubscriptionTier;
  tierConfig: typeof SUBSCRIPTION_TIERS[SubscriptionTier];
  unitCount: number;
  unitLimit: number;
  nearLimit: boolean;
  atLimit: boolean;
  features: TierFeatures;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date | null;
  trialDaysLeft: number;
  hasPaidPlan: boolean;
}

const TIER_ORDER: SubscriptionTier[] = ['starter', 'pro', 'enterprise'];

const FEATURE_DETAILS: {
  key: keyof TierFeatures;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  { key: 'automaticRentReminders', label: 'Automatic Rent Reminders', icon: Bell, description: 'Send automated reminders before rent is due' },
  { key: 'automaticLateFees', label: 'Automatic Late Fees', icon: DollarSign, description: 'Automatically apply late fees after grace period' },
  { key: 'employmentChecksPerMonth', label: 'Employment Verification', icon: Briefcase, description: 'Verify tenant employment during screening' },
  { key: 'teamManagement', label: 'Team Management', icon: Users, description: 'Add employees and manage permissions' },
  { key: 'teamCommunications', label: 'Team Communications', icon: MessageSquare, description: 'Built-in messaging for your team' },
  { key: 'advancedAccounting', label: 'Advanced Accounting (GL, Reports, Owner Statements)', icon: BookOpen, description: 'Double-entry GL, trial balance, P&L, balance sheet, tenant ledger, owner distributions + PDF' },
  { key: 'quickbooksIntegration', label: 'QuickBooks Integration', icon: Calculator, description: 'Two-way sync with QuickBooks Online' },
  { key: 'turbotaxIntegration', label: 'TurboTax / Tax Export', icon: Receipt, description: 'Export financials for tax filing' },
  { key: 'advancedAnalytics', label: 'Advanced Analytics', icon: LineChart, description: 'Investor-grade reports, ROI, NOI, yield' },
  { key: 'customBranding', label: 'Custom Branding', icon: Palette, description: 'White-label your tenant portal' },
  { key: 'apiAccess', label: 'API Access', icon: Code, description: 'Integrate with your own systems' },
  { key: 'webhooks', label: 'Webhooks', icon: Webhook, description: 'Real-time event notifications' },
];

// Matches the billing-client card style exactly
const TIER_META = {
  starter: {
    icon: Building2,
    iconBg: 'bg-blue-500/20',
    cardClass: 'bg-gradient-to-br from-cyan-600 via-blue-500 to-violet-600 border-black/30 shadow-2xl shadow-cyan-500/20',
    buttonClass: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-400 hover:to-cyan-400 shadow-lg shadow-blue-500/30',
    downgradeClass: 'bg-white/10 text-white border-white/20 hover:bg-white/20',
    currentClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  },
  pro: {
    icon: Zap,
    iconBg: 'bg-violet-500/20',
    cardClass: 'bg-gradient-to-br from-cyan-600 via-blue-500 to-violet-600 border-black/30 shadow-2xl shadow-violet-500/20',
    buttonClass: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-400 hover:to-purple-400 shadow-lg shadow-violet-500/30',
    downgradeClass: 'bg-white/10 text-white border-white/20 hover:bg-white/20',
    currentClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  },
  enterprise: {
    icon: Crown,
    iconBg: 'bg-amber-500/20',
    cardClass: 'bg-gradient-to-br from-cyan-600 via-blue-500 to-violet-600 border-black/30 shadow-2xl shadow-amber-500/20',
    buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30',
    downgradeClass: 'bg-white/10 text-white border-white/20 hover:bg-white/20',
    currentClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  },
};

// Short feature bullet list shown on each plan card
const TIER_FEATURES_SHORT: Record<SubscriptionTier, string[]> = {
  starter: [
    'Up to 24 units',
    'Online rent collection',
    'Custom subdomain portal',
    'Maintenance ticket system',
    'Digital leases with E-Sign',
    'Unlimited leases & applications',
    'Free Lease Builder',
    'ID & Paystub Scanner',
  ],
  pro: [
    'Everything in Starter',
    'Up to 150 units',
    'QuickBooks & TurboTax integration',
    'Automatic rent reminders',
    'Auto late fee charges',
    'Up to 5 team members',
    'Team management & chat',
    'Advanced analytics',
  ],
  enterprise: [
    'Everything in Pro',
    'Unlimited units & team members',
    'Shift scheduling & GPS time clock',
    'Timesheet approval workflow',
    'Team payroll processing',
    'Custom branding',
    'API access & webhooks',
    'Dedicated account manager',
  ],
};

export function SubscriptionDashboard({
  currentTier,
  tierConfig,
  unitCount,
  unitLimit,
  nearLimit,
  atLimit,
  features,
  cancelAtPeriodEnd = false,
  currentPeriodEnd,
  trialDaysLeft,
  hasPaidPlan,
}: SubscriptionDashboardProps) {
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const isYearly = billingInterval === 'yearly';
  const usagePercent =
    unitLimit === Infinity ? 0 : Math.min(100, (unitCount / unitLimit) * 100);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleUpgrade = async (tier: SubscriptionTier) => {
    setLoadingTier(tier);
    setError(null);
    try {
      const res = await fetch('/api/landlord/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingInterval }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.message || 'Failed to start checkout. Please try again.');
        setLoadingTier(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoadingTier(null);
    }
  };

  const handleManageBilling = async () => {
    setIsManaging(true);
    setError(null);
    try {
      const res = await fetch('/api/landlord/subscription/manage', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        setError(data.message || 'Failed to open billing portal.');
        setIsManaging(false);
      }
    } catch {
      setError('Failed to connect to billing system.');
      setIsManaging(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure? You'll keep access until the end of your billing period.")) return;
    setIsManaging(true);
    setError(null);
    try {
      const res = await fetch('/api/landlord/subscription/manage', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        setError(data.message || 'Failed to cancel subscription.');
        setIsManaging(false);
      }
    } catch {
      setError('Failed to cancel subscription.');
      setIsManaging(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/landlord/subscription/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        setError(data.message || 'Sync failed.');
        setIsSyncing(false);
      }
    } catch {
      setError('Sync failed.');
      setIsSyncing(false);
    }
  };

  // ── Trial urgency theming ──────────────────────────────────────────────────
  const trialIsUrgent = !hasPaidPlan && trialDaysLeft > 0 && trialDaysLeft <= 2;
  const trialIsWarning = !hasPaidPlan && trialDaysLeft > 0 && trialDaysLeft <= 4;
  const trialBannerBg = trialIsUrgent
    ? 'bg-red-500/10 border-red-500/30'
    : trialIsWarning
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-blue-500/10 border-blue-500/30';
  const trialTextColor = trialIsUrgent
    ? 'text-red-400'
    : trialIsWarning
    ? 'text-amber-400'
    : 'text-blue-400';
  const trialDotColor = trialIsUrgent
    ? 'bg-red-500'
    : trialIsWarning
    ? 'bg-amber-500'
    : 'bg-blue-500';

  return (
    <div className='space-y-6'>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className='space-y-1'>
        <h1 className='text-2xl md:text-3xl font-bold text-gray-900 tracking-tight'>Subscription</h1>
        <p className='text-sm text-slate-500'>
          Manage your plan, track usage, and unlock more features.
        </p>
      </div>

      {/* ── Trial countdown banner ───────────────────────────────────────── */}
      {!hasPaidPlan && trialDaysLeft > 0 && (
        <div className={`rounded-xl border px-4 py-3.5 ${trialBannerBg}`}>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <span className='relative flex h-2.5 w-2.5 shrink-0'>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${trialDotColor}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${trialDotColor}`} />
              </span>
              <div>
                <p className={`text-sm font-semibold ${trialTextColor}`}>
                  {trialDaysLeft === 1
                    ? '⚠️ Your free trial ends tomorrow.'
                    : `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}.`}
                </p>
                <p className='text-xs text-slate-400 mt-0.5'>
                  Upgrade now to keep uninterrupted access. Your card is charged today and renews every 30 days.
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${trialTextColor} ${trialBannerBg}`}>
                <Clock className='h-3.5 w-3.5' />
                {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Trial expired banner ─────────────────────────────────────────── */}
      {!hasPaidPlan && trialDaysLeft === 0 && (
        <div className='rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3.5'>
          <div className='flex items-center gap-3'>
            <AlertCircle className='h-5 w-5 text-red-400 shrink-0' />
            <div>
              <p className='text-sm font-semibold text-red-400'>Your free trial has ended.</p>
              <p className='text-xs text-slate-400 mt-0.5'>
                Choose a plan below to restore full access to your dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Error message ────────────────────────────────────────────────── */}
      {error && (
        <div className='rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2'>
          <AlertCircle className='h-4 w-4 shrink-0' />
          {error}
        </div>
      )}

      {/* ── Current plan card ────────────────────────────────────────────── */}
      <div className='rounded-2xl border border-black/10 bg-gradient-to-br from-cyan-600 via-blue-500 to-violet-600 p-6 shadow-2xl shadow-blue-500/20'>
        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2.5'>
              <div className='rounded-xl bg-white/15 p-2 border border-white/20'>
                <Crown className='h-5 w-5 text-amber-300' />
              </div>
              <div>
                <h2 className='text-lg font-bold text-white'>
                  {hasPaidPlan ? `Current Plan: ${tierConfig.name}` : 'Free Trial Active'}
                </h2>
                <p className='text-xs text-white/70 mt-0.5'>{tierConfig.description}</p>
              </div>
            </div>
          </div>
          <div className='text-right shrink-0'>
            {hasPaidPlan ? (
              <>
                <span className='text-3xl font-bold text-white'>${tierConfig.price}</span>
                <span className='text-white/70 text-sm'>/mo</span>
              </>
            ) : (
              <div className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1'>
                <Sparkles className='h-3.5 w-3.5 text-emerald-300' />
                <span className='text-xs font-bold text-emerald-200'>Free Trial</span>
              </div>
            )}
          </div>
        </div>

        {/* Usage bar */}
        <div className='mt-5'>
          <div className='flex justify-between text-xs mb-1.5'>
            <span className='text-white/60 font-semibold uppercase tracking-wider'>Unit Usage</span>
            <span className={`font-bold ${atLimit ? 'text-red-300' : nearLimit ? 'text-amber-300' : 'text-white'}`}>
              {unitCount} / {unitLimit === Infinity ? '∞' : unitLimit} units
            </span>
          </div>
          <div className='h-2.5 rounded-full bg-black/20 overflow-hidden'>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                atLimit ? 'bg-red-400' : nearLimit ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {atLimit && (
            <p className='mt-1.5 text-xs text-red-300 font-semibold'>
              Unit limit reached — upgrade to add more properties.
            </p>
          )}
          {nearLimit && !atLimit && (
            <p className='mt-1.5 text-xs text-amber-300 font-semibold'>
              Approaching your unit limit. Consider upgrading soon.
            </p>
          )}
        </div>

        {/* Manage buttons — only for paid plans */}
        {hasPaidPlan && (
          <div className='mt-5 pt-5 border-t border-white/15 flex flex-wrap gap-3 items-center'>
            <button
              onClick={handleManageBilling}
              disabled={isManaging}
              className='inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition-colors disabled:opacity-50'
            >
              <Settings className='h-4 w-4' />
              {isManaging ? 'Opening…' : 'Manage Billing'}
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className='inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 transition-colors disabled:opacity-50'
            >
              <TrendingUp className='h-3.5 w-3.5' />
              {isSyncing ? 'Syncing…' : 'Sync Status'}
            </button>
            {cancelAtPeriodEnd ? (
              <span className='text-sm text-amber-300 flex items-center gap-1.5'>
                <XCircle className='h-4 w-4' />
                Cancels on{' '}
                {currentPeriodEnd
                  ? new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })
                  : 'end of billing period'}
              </span>
            ) : (
              <button
                onClick={handleCancelSubscription}
                disabled={isManaging}
                className='inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-xl transition-colors'
              >
                <XCircle className='h-4 w-4' />
                Cancel Subscription
              </button>
            )}
          </div>
        )}

        {/* Current feature grid */}
        <div className='mt-5 pt-5 border-t border-white/15'>
          <h3 className='text-xs font-bold uppercase tracking-wider text-white/60 mb-3'>Your Features</h3>
          <div className='grid gap-2 sm:grid-cols-2'>
            {FEATURE_DETAILS.map(({ key, label, icon: Icon }) => {
              const value = features[key as keyof TierFeatures];
              const hasFeature = typeof value === 'boolean' ? value : (value as number) > 0;
              return (
                <div key={key} className='flex items-center gap-2 text-xs text-white'>
                  <div className={`rounded-full p-0.5 shrink-0 ${hasFeature ? 'bg-emerald-400/20' : 'bg-white/15'}`}>
                    <Icon className={`h-3.5 w-3.5 ${hasFeature ? 'text-emerald-300' : 'text-white/60'}`} />
                  </div>
                  <span className={`font-semibold ${hasFeature ? 'text-white' : 'text-white/75'}`}>{label}</span>
                  {typeof value === 'number' && value > 0 && value !== Infinity && (
                    <span className='text-white/60'>({value}/mo)</span>
                  )}
                  {!hasFeature && (
                    <span className='text-[10px] font-bold text-white/50 ml-0.5'>↑ Upgrade</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Billing interval toggle ──────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <h2 className='text-lg font-bold text-gray-900'>
          {hasPaidPlan ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <div className='flex items-center gap-3'>
          <span className={`text-sm font-semibold ${!isYearly ? 'text-black' : 'text-black/40'}`}>Monthly</span>
          <button
            onClick={() => setBillingInterval(isYearly ? 'monthly' : 'yearly')}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
              isYearly ? 'bg-gradient-to-r from-violet-500 to-purple-500' : 'bg-black/20'
            }`}
            aria-label='Toggle billing interval'
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                isYearly ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-semibold ${isYearly ? 'text-black' : 'text-black/40'}`}>Yearly</span>
          {isYearly && (
            <span className='inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-xs font-bold text-white shadow-md shadow-emerald-500/20'>
              Save {YEARLY_DISCOUNT_PERCENT}%
            </span>
          )}
        </div>
      </div>

      {/* ── Plan cards ──────────────────────────────────────────────────── */}
      <div className='grid gap-5 md:grid-cols-3'>
        {TIER_ORDER.map((tier, idx) => {
          const config = SUBSCRIPTION_TIERS[tier];
          const meta = TIER_META[tier];
          const Icon = meta.icon;
          const isCurrent = tier === currentTier;
          const isUpgrade = TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(currentTier);
          const isLoading = loadingTier === tier;
          const isPopular = tier === 'pro';

          const displayPrice = isYearly
            ? getYearlyPrice(config.price)
            : config.price;

          return (
            <div
              key={tier}
              className={`relative group rounded-2xl border p-5 flex flex-col transition-all duration-300 hover:scale-[1.02] ${meta.cardClass} ${
                isPopular ? 'scale-[1.02] md:scale-105 z-10' : ''
              }`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Badge */}
              {isCurrent ? (
                <div className='absolute -top-3 left-1/2 -translate-x-1/2 z-20'>
                  <div className='bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1'>
                    <CheckCircle2 className='h-2.5 w-2.5' />
                    CURRENT PLAN
                  </div>
                </div>
              ) : isPopular && !isCurrent ? (
                <div className='absolute -top-3 left-1/2 -translate-x-1/2 z-20'>
                  <div className='bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1'>
                    <Zap className='h-2.5 w-2.5' />
                    MOST POPULAR
                  </div>
                </div>
              ) : null}

              {/* Tier header */}
              <div className={`flex items-center gap-3 mb-3 ${isCurrent || isPopular ? 'pt-2' : ''}`}>
                <div className={`rounded-xl ${meta.iconBg} p-2.5 border border-white/20`}>
                  <Icon className='h-5 w-5 text-white' />
                </div>
                <div>
                  <h3 className='text-base font-bold text-white'>{config.name}</h3>
                  <p className='text-xs text-white/70'>
                    {config.unitLimit === Infinity ? 'Unlimited units' : `Up to ${config.unitLimit} units`}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className='mb-2'>
                {isYearly ? (
                  <>
                    <div className='flex items-baseline gap-1'>
                      <span className='text-3xl font-bold text-white'>${displayPrice.toFixed(2)}</span>
                      <span className='text-white/70 text-sm font-semibold'>/year</span>
                    </div>
                    <div className='mt-0.5 flex items-center gap-2'>
                      <span className='text-sm line-through text-white/40'>
                        ${(config.price * 12).toFixed(2)}/yr
                      </span>
                      <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300'>
                        Save ${((config.price * 12) - displayPrice).toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className='flex items-baseline gap-1'>
                    <span className='text-3xl font-bold text-white'>${config.price}</span>
                    <span className='text-white/70 text-sm font-semibold'>/month</span>
                  </div>
                )}
              </div>

              <p className='text-xs text-white/70 font-semibold mb-3'>{config.description}</p>

              {/* CTA button */}
              {isCurrent ? (
                <button
                  disabled
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm mb-4 border ${meta.currentClass} cursor-default`}
                >
                  <span className='flex items-center justify-center gap-2'>
                    <CheckCircle2 className='h-4 w-4' />
                    Current Plan
                  </span>
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={loadingTier !== null}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed ${meta.buttonClass}`}
                >
                  {isLoading ? (
                    <div className='h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  ) : (
                    <>
                      Upgrade to {config.name}
                      <ArrowRight className='h-4 w-4 group-hover:translate-x-1 transition-transform' />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleManageBilling}
                  disabled={isManaging}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm mb-4 border transition-colors disabled:opacity-50 ${meta.downgradeClass}`}
                >
                  Downgrade
                </button>
              )}

              {/* Feature list */}
              <div className='flex-1'>
                <p className='text-[10px] font-bold uppercase tracking-wider text-white/60 mb-2'>What's included</p>
                <ul className='space-y-1.5'>
                  {TIER_FEATURES_SHORT[tier].map((f, i) => (
                    <li key={i} className='flex items-start gap-2 text-xs text-white font-semibold'>
                      <div className='mt-0.5 rounded-full p-0.5 bg-white/20 text-white flex-shrink-0'>
                        <Check className='h-3 w-3' />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Upsell strip — trial users ──────────────────────────────────── */}
      {!hasPaidPlan && (
        <div className='rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-start gap-3'>
              <div className='rounded-xl bg-violet-100 p-2.5 shrink-0'>
                <Sparkles className='h-5 w-5 text-violet-600' />
              </div>
              <div>
                <p className='text-sm font-bold text-violet-900'>
                  Upgrade to Pro before your trial ends.
                </p>
                <p className='text-xs text-violet-700 mt-1 max-w-md'>
                  You're on a free trial with full feature access. Upgrade now to lock in your plan — your card is charged today and renews every 30 days from your upgrade date.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={loadingTier !== null}
              className='shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white px-5 py-2.5 text-sm font-bold shadow-md shadow-violet-500/25 hover:from-violet-400 hover:to-purple-400 transition-all disabled:opacity-50'
            >
              <Zap className='h-4 w-4' />
              {loadingTier === 'pro' ? 'Loading…' : 'Start Pro — Most Popular'}
            </button>
          </div>
        </div>
      )}

      {/* ── Feature comparison table ─────────────────────────────────────── */}
      <div className='rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='px-6 py-5 border-b border-gray-100'>
          <h2 className='text-lg font-bold text-gray-900'>Feature Comparison</h2>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-100'>
                <th className='text-left py-3 px-5 text-xs font-bold uppercase tracking-wider text-gray-400'>Feature</th>
                {TIER_ORDER.map((tier) => (
                  <th
                    key={tier}
                    className={`text-center py-3 px-4 text-xs font-bold uppercase tracking-wider ${
                      tier === currentTier ? 'text-violet-600' : 'text-gray-400'
                    }`}
                  >
                    {SUBSCRIPTION_TIERS[tier].name}
                    {tier === currentTier && (
                      <span className='ml-1.5 inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600 uppercase'>
                        You
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className='border-b border-gray-50 bg-gray-50/50'>
                <td className='py-3 px-5 text-sm font-semibold text-gray-700'>Unit Limit</td>
                {TIER_ORDER.map((tier) => (
                  <td key={tier} className='text-center py-3 px-4 text-sm font-bold text-gray-900'>
                    {SUBSCRIPTION_TIERS[tier].unitLimit === Infinity ? '∞' : SUBSCRIPTION_TIERS[tier].unitLimit}
                  </td>
                ))}
              </tr>
              {FEATURE_DETAILS.map(({ key, label }, rowIdx) => (
                <tr
                  key={key}
                  className={`border-b border-gray-50 ${rowIdx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                >
                  <td className='py-3 px-5 text-sm text-gray-600'>{label}</td>
                  {TIER_ORDER.map((tier) => {
                    const value = SUBSCRIPTION_TIERS[tier].features[key as keyof TierFeatures];
                    const hasFeature = typeof value === 'boolean' ? value : (value as number) > 0;
                    return (
                      <td key={tier} className='text-center py-3 px-4'>
                        {hasFeature ? (
                          typeof value === 'number' && value !== Infinity ? (
                            <span className='text-sm font-semibold text-emerald-600'>{value}/mo</span>
                          ) : (
                            <div className='flex justify-center'>
                              <div className='rounded-full bg-emerald-100 p-1'>
                                <Check className='h-3.5 w-3.5 text-emerald-600' />
                              </div>
                            </div>
                          )
                        ) : (
                          <span className='text-gray-300 text-sm'>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Trust pills ─────────────────────────────────────────────────── */}
      <div className='flex flex-wrap items-center justify-center gap-2'>
        {['Cancel anytime', 'No contracts', 'No setup fees', 'Stripe-secured'].map((text) => (
          <span
            key={text}
            className='inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700'
          >
            <span className='text-emerald-500 font-bold'>✓</span>
            {text}
          </span>
        ))}
      </div>

      {/* ── Security trust bar ───────────────────────────────────────────── */}
      <div className='rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4 space-y-3'>
        <p className='text-center text-xs font-bold text-slate-500 uppercase tracking-wider'>
          Your payment information is 100% secure
        </p>
        <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-3'>
          <div className='flex items-center gap-2 text-slate-600'>
            <Lock className='h-4 w-4 text-emerald-500 flex-shrink-0' />
            <span className='text-xs font-semibold'>256-bit SSL encryption</span>
          </div>
          <div className='flex items-center gap-2 text-slate-600'>
            <CreditCard className='h-4 w-4 text-blue-500 flex-shrink-0' />
            <span className='text-xs font-semibold'>PCI-DSS compliant · Powered by Stripe</span>
          </div>
          <div className='flex items-center gap-2 text-slate-600'>
            <ShieldCheck className='h-4 w-4 text-violet-500 flex-shrink-0' />
            <span className='text-xs font-semibold'>Bank-level security</span>
          </div>
          <div className='flex items-center gap-2 text-slate-600'>
            <BadgeCheck className='h-4 w-4 text-cyan-500 flex-shrink-0' />
            <span className='text-xs font-semibold'>99.9% uptime SLA</span>
          </div>
        </div>
        <p className='text-center text-xs text-slate-400 leading-relaxed max-w-xl mx-auto'>
          Your card details are{' '}
          <strong className='text-slate-600'>never stored on our servers</strong>. All payment
          information is processed by{' '}
          <a
            href='https://stripe.com/security'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 underline underline-offset-2 hover:text-blue-700'
          >
            Stripe
          </a>
          , a certified PCI Level 1 payment processor.
        </p>
      </div>

    </div>
  );
}
