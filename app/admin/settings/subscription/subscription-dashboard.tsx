'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_TIERS, SubscriptionTier, TierFeatures } from '@/lib/config/subscription-tiers';
import { Check, Zap, Building2, Bell, DollarSign, Users, MessageSquare, Briefcase, Crown, Settings, XCircle, RefreshCw, Palette, Code, Webhook, BookOpen, LineChart, Calculator, Receipt } from 'lucide-react';

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
}

const TIER_ORDER: SubscriptionTier[] = ['starter', 'pro', 'enterprise'];

const FEATURE_DETAILS = [
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
}: SubscriptionDashboardProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);

  const usagePercent = unitLimit === Infinity ? 0 : Math.min(100, (unitCount / unitLimit) * 100);

  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setIsLoading(true);
    setSelectedTier(tier);
    try {
      const res = await fetch('/api/landlord/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tier,
        }),
      });
      const data = await res.json();
      
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.message || 'Failed to start checkout');
        setIsLoading(false);
        setSelectedTier(null);
      }
    } catch {
      alert('Failed to connect to payment system');
      setIsLoading(false);
      setSelectedTier(null);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/landlord/subscription/manage', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success && data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        alert(data.message || 'Failed to open billing portal');
      }
    } catch {
      alert('Failed to connect to billing system');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel? You\'ll keep access until the end of your billing period.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/landlord/subscription/manage', {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        alert('Subscription canceled. You\'ll keep access until the end of your billing period.');
        window.location.reload();
      } else {
        alert(data.message || 'Failed to cancel subscription');
      }
    } catch {
      alert('Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncSubscription = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/landlord/subscription/sync', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        window.location.reload();
      } else {
        alert(data.message || 'Failed to sync subscription');
      }
    } catch {
      alert('Failed to sync subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Plan Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Current Plan: {tierConfig.name}</h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">{tierConfig.description}</p>
          </div>
          {tierConfig.price !== null && tierConfig.price > 0 && (
            <div className="text-right">
              <span className="text-3xl font-bold text-white">${tierConfig.price}</span>
              <span className="text-slate-400">/mo</span>
            </div>
          )}
        </div>

        {/* Usage Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Unit Usage</span>
            <span className={`font-medium ${atLimit ? 'text-red-400' : nearLimit ? 'text-amber-400' : 'text-white'}`}>
              {unitCount} / {unitLimit === Infinity ? '∞' : unitLimit} units
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {atLimit && (
            <p className="mt-2 text-sm text-red-400">
              You've reached your unit limit. Upgrade to add more properties.
            </p>
          )}
          {nearLimit && !atLimit && (
            <p className="mt-2 text-sm text-amber-400">
              You're approaching your unit limit. Consider upgrading soon.
            </p>
          )}
        </div>

        {/* Manage Subscription Buttons */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-3 items-center">
          {currentTier !== 'starter' && (
            <>
              <Button
                onClick={handleManageBilling}
                disabled={isLoading}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
              {cancelAtPeriodEnd ? (
                <span className="text-sm text-amber-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  Cancels on{' '}
                  {currentPeriodEnd
                    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'end of billing period'}
                </span>
              ) : (
                <Button
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              )}
            </>
          )}
        </div>

        {/* Current Features */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Your Features</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURE_DETAILS.map(({ key, label, icon: Icon }) => {
              const value = features[key as keyof TierFeatures];
              const hasFeature = typeof value === 'boolean' ? value : (value as number) > 0;
              
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 text-sm ${hasFeature ? 'text-white' : 'text-slate-500'}`}
                >
                  <Icon className={`h-4 w-4 ${hasFeature ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>{label}</span>
                  {typeof value === 'number' && value > 0 && value !== Infinity && (
                    <span className="text-slate-400">({value}/mo)</span>
                  )}
                  {!hasFeature && <span className="text-xs text-slate-500">(Upgrade)</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TIER_ORDER.map((tier) => {
            const config = SUBSCRIPTION_TIERS[tier];
            const isCurrent = tier === currentTier;
            const isUpgrade = TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(currentTier);

            return (
              <div
                key={tier}
                className={`rounded-xl border p-5 transition-all ${
                  isCurrent
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-white/10 bg-slate-900/50 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{config.name}</h3>
                  {isCurrent && (
                    <span className="text-xs bg-violet-500 text-white px-2 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  {config.price !== null ? (
                    <>
                      <span className="text-2xl font-bold text-white">${config.price}</span>
                      <span className="text-slate-400">/mo</span>
                    </>
                  ) : (
                    <span className="text-lg font-semibold text-white">Contact Us</span>
                  )}
                </div>

                <p className="text-sm text-slate-400 mb-4">{config.description}</p>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <Building2 className="h-4 w-4 text-emerald-400" />
                    {config.unitLimit === Infinity ? 'Unlimited' : `Up to ${config.unitLimit}`} units
                  </li>
                  {FEATURE_DETAILS.slice(0, 3).map(({ key, label, icon: Icon }) => {
                    const value = config.features[key as keyof typeof config.features];
                    const hasFeature = typeof value === 'boolean' ? value : (value as number) > 0;
                    
                    if (!hasFeature) return null;
                    
                    return (
                      <li key={key} className="flex items-center gap-2 text-sm text-slate-300">
                        <Icon className="h-4 w-4 text-emerald-400" />
                        {label}
                        {typeof value === 'number' && value !== Infinity && (
                          <span className="text-slate-500">({value}/mo)</span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {isUpgrade && (
                  <Button
                    onClick={() => handleUpgrade(tier)}
                    disabled={isLoading && selectedTier === tier}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {isLoading && selectedTier === tier ? 'Loading...' : 'Upgrade'}
                  </Button>
                )}
                {isCurrent && (
                  <Button disabled className="w-full" variant="outline">
                    Current Plan
                  </Button>
                )}
                {!isUpgrade && !isCurrent && (
                  <Button
                    onClick={handleManageBilling}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    Downgrade
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Feature</th>
                {TIER_ORDER.map((tier) => (
                  <th key={tier} className="text-center py-3 px-4 text-sm font-medium text-slate-400">
                    {SUBSCRIPTION_TIERS[tier].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 text-sm text-slate-300">Unit Limit</td>
                {TIER_ORDER.map((tier) => (
                  <td key={tier} className="text-center py-3 px-4 text-sm text-white">
                    {SUBSCRIPTION_TIERS[tier].unitLimit === Infinity ? '∞' : SUBSCRIPTION_TIERS[tier].unitLimit}
                  </td>
                ))}
              </tr>
              {FEATURE_DETAILS.map(({ key, label }) => (
                <tr key={key} className="border-b border-white/5">
                  <td className="py-3 px-4 text-sm text-slate-300">{label}</td>
                  {TIER_ORDER.map((tier) => {
                    const value = SUBSCRIPTION_TIERS[tier].features[key as keyof TierFeatures];
                    const hasFeature = typeof value === 'boolean' ? value : (value as number) > 0;
                    
                    return (
                      <td key={tier} className="text-center py-3 px-4">
                        {hasFeature ? (
                          typeof value === 'number' && value !== Infinity ? (
                            <span className="text-sm text-white">{value}/mo</span>
                          ) : (
                            <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                          )
                        ) : (
                          <span className="text-slate-600">—</span>
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

      {/* ── Trust & guarantee strip ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Guarantee */}
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/20 p-2.5 border border-emerald-500/30 shrink-0">
              <Check className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Cancel anytime · No contracts</p>
              <p className="text-xs text-slate-400">Keep access until the end of your billing period. No questions asked.</p>
            </div>
          </div>

          {/* Security badges */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-5 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-400">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-semibold text-slate-300">256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-xs font-semibold text-slate-300">PCI Compliant</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs font-semibold text-slate-300">Bank-level security</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-slate-300">99.9% uptime</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
