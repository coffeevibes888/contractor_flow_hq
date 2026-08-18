'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Check,
  Zap,
  Building2,
  Crown,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { YEARLY_DISCOUNT_PERCENT, getYearlyMonthlyEquivalent, getYearlyPrice } from '@/lib/config/subscription-tiers';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(39),
    description: 'Perfect for small landlords.',
    unitLimit: 'Up to 24 units',
    icon: Building2,
    popular: false,
    comingSoon: false,
    features: [
      { name: 'Up to 24 units', included: true },
      { name: 'Online rent collection', included: true },
      { name: 'Custom Subdomain (yourname.propertyflowhq.com)', included: true },
      { name: 'Maintenance Ticket System', included: true },
      { name: 'Digital leases with E-Sign', included: true },
      { name: 'Contractor Marketplace', included: true },
      { name: 'Basic Reporting', included: true },
      { name: 'Automated Application Process', included: true },
      { name: 'Free Lease Builder', included: true },
      { name: 'ID & Paystub Scanner', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-300',
    iconColorLight: 'text-blue-500',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(99),
    description: 'For growing landlords. The only tool that scales with you.',
    unitLimit: 'Up to 150 units',
    icon: Zap,
    popular: true,
    comingSoon: false,
    features: [
      { name: 'Everything in Starter', included: true },
      { name: 'Up to 150 units', included: true },
      { name: 'QuickBooks & TurboTax integration', included: true },
      { name: 'Automatic rent reminders', included: true },
      { name: 'Auto late fee charges', included: true },
      { name: 'Up to 5 team members', included: true },
      { name: 'Team management & Slack-like chat', included: true },
      { name: 'Advanced analytics & Reporting', included: true },
      { name: 'Priority support', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-300',
    iconColorLight: 'text-violet-500',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(199),
    description: 'Full-scale property management operations.',
    unitLimit: 'Unlimited units',
    icon: Crown,
    popular: false,
    comingSoon: false,
    features: [
      { name: 'Unlimited Units', included: true },
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Advanced roles & permissions', included: true },
      { name: 'Shift scheduling & calendar', included: true },
      { name: 'Time tracking with GPS', included: true },
      { name: 'Timesheet approval workflow', included: true },
      { name: 'Performance reports', included: true },
      { name: 'Priority 24/7 support', included: true },
      { name: 'Dedicated account manager', included: true },
      { name: 'API access & webhooks', included: true },
      { name: 'Multi-property dashboard', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    iconColorLight: 'text-amber-500',
  },
];

// Contractor pricing is handled inline in the component (single-plan layout)
// No contractorTiers array needed.

export default function PricingSection({ variant = 'pm' }: { variant?: 'pm' | 'contractor' }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const isContractor = variant === 'contractor';
  const isYearly = billingInterval === 'yearly';

  const handleTierClick = async (tierId: string) => {
    setLoadingTier(tierId);

    if (status === 'authenticated' && session?.user) {
      if (isContractor) {
        router.push(`/sign-up?role=contractor&plan=${tierId}&interval=${billingInterval}`);
      } else if (session.user.role === 'admin' || session.user.role === 'landlord') {
        router.push(`/onboarding/landlord/subscription?plan=${tierId}&interval=${billingInterval}`);
      } else {
        router.push(`/sign-up?role=landlord&plan=${tierId}&interval=${billingInterval}`);
      }
    } else {
      router.push(isContractor ? `/sign-up?role=contractor&plan=${tierId}&interval=${billingInterval}` : `/sign-up?role=landlord&plan=${tierId}&interval=${billingInterval}`);
    }

    setLoadingTier(null);
  };

  // ── Contractor: single-plan value section ──
  if (isContractor) {
    return (
      <section id="pricing" className="w-full py-20 md:py-28 px-4 relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-200/30 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center space-y-4 mb-14 animate-in fade-in duration-700">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-slate-900 text-sm font-medium border border-black bg-white">
              <Sparkles className="h-4 w-4 text-rose-500" />
              <span className="text-black font-bold">One Plan. Everything Included.</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-black">
              $99/month. No limits. No surprises.
            </h2>
            <p className="text-lg text-slate-700 font-medium max-w-2xl mx-auto">
              14-day free trial — no credit card required. Cancel anytime.
            </p>
          </div>

          {/* Main content: Price hero left + Features right */}
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left — Price card */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-8 md:p-10 shadow-2xl sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-orange-500/20 p-3 border border-orange-500/30">
                  <Zap className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Unlimited</h3>
                  <p className="text-sm text-slate-400">Everything for your business</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                {isYearly ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-white">${getYearlyPrice(99).toFixed(2)}</span>
                      <span className="text-slate-400 font-semibold">/year</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm line-through text-slate-500">${(99 * 12).toFixed(2)}/yr</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        Save ${((99 * 12) - getYearlyPrice(99)).toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">$99</span>
                    <span className="text-slate-400 font-semibold">/month</span>
                  </div>
                )}
              </div>

              {/* Billing toggle */}
              <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-700/50">
                <span className={`text-sm font-semibold ${!isYearly ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
                <button
                  onClick={() => setBillingInterval(isYearly ? 'monthly' : 'yearly')}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    isYearly ? 'bg-gradient-to-r from-orange-500 to-rose-500' : 'bg-slate-600'
                  }`}
                  aria-label="Toggle billing interval"
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isYearly ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
                <span className={`text-sm font-semibold ${isYearly ? 'text-white' : 'text-slate-500'}`}>Yearly</span>
                {isYearly && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Save {YEARLY_DISCOUNT_PERCENT}%
                  </span>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleTierClick('pro')}
                disabled={loadingTier === 'pro'}
                className="w-full py-4 px-6 rounded-xl font-bold text-base bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-400 hover:to-orange-400 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loadingTier === 'pro' ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-400 mt-4">
                No credit card required. Cancel anytime.
              </p>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-3 mt-8">
                {[
                  { icon: '🔒', text: 'Bank-level security' },
                  { icon: '⚡', text: 'Stripe payments' },
                  { icon: '✓', text: 'Cancel anytime' },
                  { icon: '🎯', text: 'No contracts' },
                ].map((badge) => (
                  <div key={badge.text} className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Feature categories */}
            <div className="space-y-8">
              {[
                {
                  category: 'Jobs & Invoicing',
                  features: ['Unlimited jobs & work orders', 'Professional invoicing & estimates', 'E-sign contracts', 'Online payment collection (Stripe)', 'Automated payment reminders', 'Recurring invoices'],
                },
                {
                  category: 'Team & Scheduling',
                  features: ['Unlimited team members', 'Team scheduling & dispatch', 'GPS time tracking & timesheets', 'Payroll processing & direct deposit', 'Role-based permissions', 'Team chat'],
                },
                {
                  category: 'Clients & Growth',
                  features: ['CRM & customer portal', 'Lead management & pipeline', 'Contractor Marketplace listing', 'Branded subdomain profile', 'Marketing campaigns & referrals', 'Review management'],
                },
                {
                  category: 'Operations',
                  features: ['Inventory & equipment tracking', 'Subcontractor management', 'QuickBooks & accounting sync', 'Advanced reporting & analytics', 'API access & integrations', 'Priority support'],
                },
              ].map((group) => (
                <div key={group.category} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-rose-600 mb-4">{group.category}</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700 font-medium">
                        <div className="mt-0.5 rounded-full bg-emerald-100 p-0.5 shrink-0">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor comparison */}
          <div className="mt-20">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold text-black">Why contractors switch to us</h3>
              <p className="text-slate-600 mt-2">Same tools. Fraction of the price. Zero per-lead fees.</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left py-4 px-5 font-semibold text-slate-500">Feature</th>
                    <th className="text-center py-4 px-4 font-bold text-rose-600">PropertyFlow HQ</th>
                    <th className="text-center py-4 px-4 font-semibold text-slate-500">Angi Leads</th>
                    <th className="text-center py-4 px-4 font-semibold text-slate-500">Thumbtack</th>
                    <th className="text-center py-4 px-4 font-semibold text-slate-500">Jobber</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Monthly price', vals: ['$99 flat', '$300+', 'Per lead', '$129+'] },
                    { feature: 'Cost per job/lead', vals: ['$0', '$15–80+', '$15–50+', '$0'] },
                    { feature: 'Jobs & invoicing', vals: [true, false, false, true] },
                    { feature: 'Team scheduling', vals: [true, false, false, true] },
                    { feature: 'GPS time tracking', vals: [true, false, false, 'extra'] },
                    { feature: 'Inventory tracking', vals: [true, false, false, 'extra'] },
                    { feature: 'CRM & customer portal', vals: [true, false, false, 'extra'] },
                    { feature: 'Branded profile + marketplace', vals: [true, false, false, false] },
                    { feature: 'PM/Landlord lead access', vals: [true, false, false, false] },
                    { feature: 'No credit card trial', vals: [true, false, false, false] },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="py-3.5 px-5 font-medium text-slate-700">{row.feature}</td>
                      {row.vals.map((val, j) => (
                        <td key={j} className="py-3.5 px-4 text-center">
                          {val === true ? (
                            <Check className={`h-5 w-5 mx-auto ${j === 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                          ) : val === false ? (
                            <span className="text-slate-300 text-lg">✕</span>
                          ) : val === 'extra' ? (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Extra $</span>
                          ) : (
                            <span className={`font-bold ${j === 0 ? 'text-rose-600' : 'text-slate-700'}`}>{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── PM: original multi-tier layout (unchanged) ──
  return (
    <section id="pricing" className="w-full py-20 md:py-28 px-4 relative overflow-hidden scroll-mt-20">
      {/* Background effects */}
      <div className="absolute inset-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 mb-16 animate-in fade-in duration-700">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-slate-900 text-sm font-medium border border-black bg-white">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className='text-black font-bold'>Simple, Transparent Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-black">
            Start at Just $39/month. Scales as You Grow.
          </h2>
          <p className="text-lg text-black font-semibold max-w-2xl mx-auto">
            Finally an Automation Tool that saves you time and money. Let&apos;s face it your time is valuable.
          </p>

          {/* Billing Interval Toggle */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span className={`text-sm font-semibold ${!isYearly ? 'text-black' : 'text-black/50'}`}>Monthly</span>
            <button
              onClick={() => setBillingInterval(isYearly ? 'monthly' : 'yearly')}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                isYearly ? 'bg-gradient-to-r from-violet-500 to-purple-500' : 'bg-black/20'
              }`}
              aria-label="Toggle billing interval"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  isYearly ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-semibold ${isYearly ? 'text-black' : 'text-black/50'}`}>Yearly</span>
            {isYearly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                Save {YEARLY_DISCOUNT_PERCENT}%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6 max-w-6xl mx-auto">
          {tiers.map((tier, index) => {
            const Icon = tier.icon;
            const isPopular = tier.popular;

            return (
              <div
                key={tier.id}
                className={`relative group rounded-2xl border shadow-xl p-8 flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom hover:scale-105 bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 border-black shadow-2xl ${isPopular ? 'scale-105 lg:scale-110 z-10' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-violet-500 to-purple-500 shadow-violet-500/50 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Zap className="h-3 w-3" />
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Tier header */}
                <div className={`flex items-center gap-3 mb-4 ${isPopular ? 'pt-2' : ''}`}>
                  <div className={`rounded-xl ${tier.iconBg} p-3 border border-white/20`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    <p className="text-xs font-semibold text-white">{tier.unitLimit}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {isYearly ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                          ${getYearlyPrice(tier.price).toFixed(2)}
                        </span>
                        <span className="font-semibold text-white">/year</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm line-through text-white/40">
                          ${(tier.price * 12).toFixed(2)}/yr
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          Save ${((tier.price * 12) - getYearlyPrice(tier.price)).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">${tier.price}</span>
                      <span className="font-semibold text-white">/month</span>
                    </div>
                  )}
                </div>

                <p className="text-sm font-semibold mb-6 text-white">{tier.description}</p>

                {/* CTA Button */}
                <button
                  onClick={() => handleTierClick(tier.id)}
                  disabled={loadingTier === tier.id}
                  className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 mb-8 ${
                    isPopular
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-400 hover:to-purple-400 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105'
                    : tier.id === 'enterprise'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-400 hover:to-cyan-400 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105'
                  }`}
                >
                  {loadingTier === tier.id ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {tier.cta}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Features list */}
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider mb-4 text-white">
                    What&apos;s included
                  </p>
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li 
                        key={i} 
                        className={`flex items-start gap-3 text-sm ${
                          feature.included ? 'text-white font-semibold' : 'text-white/60'
                        }`}
                      >
                        <div className={`mt-0.5 rounded-full p-0.5 ${
                          feature.included ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
                        }`}>
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className={feature.included ? '' : 'line-through'}>{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Trust strip ── */}
        <div className="mt-14 flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: '✓', text: '14-day free trial' },
              { icon: '✓', text: 'Cancel anytime' },
              { icon: '✓', text: 'No contracts' },
              { icon: '✓', text: 'No setup fees' },
            ].map((item) => (
              <span
                key={item.text}
                className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold border-cyan-200 bg-cyan-50 text-cyan-700"
              >
                <span className="text-emerald-500 font-bold">{item.icon}</span>
                {item.text}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-2xl">
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span className="text-xs font-semibold">256-bit SSL</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              <span className="text-xs font-semibold">PCI Compliant · Stripe</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="text-xs font-semibold">Bank-level security</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-xs font-semibold">99.9% uptime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
